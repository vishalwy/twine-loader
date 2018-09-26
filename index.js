var loaderUtils = require('loader-utils');
var childProcess = require('child_process');
var fs = require('fs');
var tmp = require('tmp');
var readline = require('readline');
var path = require('path');
var DelayLoader = require('./delay-loader');
var InlineLoader = require('./inline-loader');
var GEM_DIR = path.join(__dirname, 'gems');

//Function to parse JSON "key":"value" string terminated by '\n'. 
//The function also replaces placeholder like '%@', '%d' etc with the currusponding arguments.
//So if a string contains placeholders, a function will be substituted that returns the interpolated string; otherwise the string itself.
function interpolateLine(line, lang) {  
  var regex = /%([0-9]+\$)?((\*|[0-9]+)?(\.(\*|[0-9]+)))?(h|hh|l|ll|q|L|z|t|j)?(%|@|d|D|u|U|x|X|o|O|f|F|e|g|G|c|C|s|S|p|a|A)/g;
  
  try {
    //parse {"key":"value"} and get the value of the first "key"
    var lineObject = JSON.parse('{' + line + '}');
    var key = Object.keys(lineObject)[0];
    var text = lineObject[key];
    var index = 0, interpolatedStr = '';
    regex.lastIndex = 0;

    //loop through to find any placeholders and replace it with currusponding arguments
    for(var result = null, lastIndex = regex.lastIndex; 
      (result = regex.exec(text)) != null; 
      lastIndex = regex.lastIndex) {
      interpolatedStr += JSON.stringify(text.substr(lastIndex, result.index - lastIndex)) + ' + ';
      
      if(result[0] === '%%')
        interpolatedStr += '"%" + ';
      else {
        var argIndex = result[1] ? Number.parseInt(result[1]) - 1 : index++;
        interpolatedStr += 'arguments[' + argIndex + '] + ';
      }
    }
    
    //if there was interpolation done, instead of using the string itself, use a function that returns the interpolated string
    return {
      key: key, 
      value: !interpolatedStr ? JSON.stringify(text) : 
        new Function('  return ' + interpolatedStr + JSON.stringify(text.substr(lastIndex)))
    };
  } catch(error) {
    throw new Error('Cannot parse for ' + lang + ' - ' + line);
  }
}

//Function parse the JSON file and returns an object representation
function parseFile(lang, outputFile, callback) {
  //we are not using JSON.parse as it doesnt give a way to identify the location of the error.
  //the JSON file generated by twine gives the content line by line, hence we are parsing each line and getting the value.
  var reader = readline.createInterface({input: fs.createReadStream(outputFile, {
    encoding: 'utf8', 
    highWaterMark: 16 * 1024  //limit buffer allocation
  })});

  var strings = {}, langError = null;

  reader.on('line', function(line) {
    line = line.trim();
    
    if(line === '' || line === '{' || line === '}')
      return;
    
    if(line[line.length - 1] === ',')
      line = line.slice(0, -1);  
        
    try {
      var ret = interpolateLine(line, lang); //interpolate the line which is a JSON "key":"value"
      strings[ret.key] = ret.value;
    } catch(error) {
      langError = error;
      reader.close();
    }
  });

  reader.on('close', function() {
    callback(langError, strings);
  });        
}

//Function to get the languages given in the query. 'en' is default
function getLanguages(options) {
  var langs = options.languages || [], uniqueLangs = {'en': true};

  for(var i = 0; i < langs.length; ++i)
    uniqueLangs[langs[i]] = true;

  return Object.keys(uniqueLangs);
}

//Main entry point for the loader. The loader should process the content and return a valid JS expression.
//https://webpack.js.org/api/loaders
module.exports = function(content) {
  this.cacheable && this.cacheable();  //mark the loader as cacheable so that it doesnt recompile everytime
  var callback = this.async();  //we are going to perform some async operations to process the content; hence mark it as async
  
  //parse the query; valid options include {languages: ['en', 'fr', ...]"}
  var options = loaderUtils.getOptions ? loaderUtils.getOptions(this) : loaderUtils.parseQuery(this.query); 
  
  var langs = getLanguages(options);  
  var twine = path.join(GEM_DIR, 'bin', 'twine');  //twine is located under gems/bin
  var langIndex = -1, langError = false, that = this, loader = null;

  //environment variable for twine command. we set GEM_HOME & GEM_PATH so that twine gem can be found
  var env = Object.assign({}, process.env, {'GEM_HOME': GEM_DIR, 'GEM_PATH': GEM_DIR});  

  //write the content to a temp file so that we can pass it to twine command
  var tmpFile = tmp.fileSync();
  fs.writeSync(tmpFile.fd, content);

  if(options.delayLoad)
    loader = new DelayLoader(this, content);
  else
    loader = new InlineLoader(this);

  //Function to generate languages one by one. This works in conjuntion with compileLang
  function generateLangs(error) {
    if(error) {
      that.emitError(error);
      langError = true;
    }

    if(++langIndex < langs.length) 
      compileLang(langs[langIndex]);
    else if(langError)
      callback(new Error('Failed to generate language files'));
    else
      callback(null, loader.generateModule());
  }

  //Function to generate language file for the language given
  function compileLang(lang) {
    //for each language generate a unique JSON file name to output and execute twine command
    var outputFile = tmp.tmpNameSync();
    var command = [twine, 'generate-localization-file', tmpFile.name, outputFile, 
      '-l', lang, '-f', 'jquery', '-i', 'all'];

    childProcess.exec(command.join(' '), {env: env}, function(error, stdout, stderr) {
      if(error || stdout || stderr) 
        generateLangs(error || new Error(stdout || stderr));
      else {
        //parse each JSON file generated by twine
        parseFile(lang, outputFile, function(error, strings) {
          fs.unlinkSync(outputFile);
          !error && loader.generateOutput(lang, strings);
          generateLangs(error);
        });
      }
    });
  }

  generateLangs();
}
