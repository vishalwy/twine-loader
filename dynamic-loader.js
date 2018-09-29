var loaderUtils = require('loader-utils');

//constructor for dynamic loading language js files
function DynamicLoader(context, content, options) {
  if(!context.emitFile) 
    throw new Error('emitFile is required from module system');

  options = options || {};
  this.context = context; 
  this.loaderFunc = options.loaderFunc || getJS;  //set the function to load the uri

  //generate hash value for emiting the cotnent in output folder
  this.urlPrefix = loaderUtils.interpolateName(context, options.urlPrefix || './[hash]-', {content: content});
} 

//method to generate the output. In this case we are writing the content to the file 
DynamicLoader.prototype.generateOutput = function(lang, strings) {
  this.context.emitFile(this.urlPrefix + lang + '.js', generateJS(strings));
};

//method to generate the module defenition
//=> module.exports = loaderModule('[urlPrefix]', loaderFunc)
DynamicLoader.prototype.generateModule = function() {
  var params = [JSON.stringify(this.urlPrefix), this.loaderFunc.toString()].join(', ');
  return 'module.exports = (' + loaderModule.toString() + ')(' + params + ')';
};

//function to require the JS file at runtime using either __non_webpack_require__() or eval().
//if we use require() direcly, Webpack will try to resolve that also, resulting in exception.  
function getJS(url) {
  return eval('require("' + url + '")');
}

//module funtion. This is the JS function defenition we return from our loader module.
function loaderModule(urlPrefix, loaderFunc) {
  var langStrings = {}, defaultLang = 'en';
  var userLang = defaultLang;

  try {
    userLang = navigator.language || userLang;
  } catch(error) {}

  /*function to load the strings for the language given.
  the function try to require the best possible JS file matching the locale.
  for the locale 'pt-br', the function tries to require the module in the order given below; 
  => '[urlPrefix]pt-br.js', '[urlPrefix]pt.js' & '[urlPrefix]en.js */
  function loadLangStrings(lang) {
    try {
      langStrings[lang] = langStrings[lang] || loaderFunc(urlPrefix + lang + '.js');
      return langStrings[lang];
    } catch(error) {}
  
    try {
      var tempLang = lang.split('-')[0];

      if(lang == tempLang) {
        if(lang == defaultLang)
          throw new Error('cannot load default language');

        tempLang = defaultLang;
      }

      langStrings[lang] = loadLangStrings(tempLang); 
    } catch(error) {}

    return langStrings[lang];  
  }
  
  //function get the string for the given language 
  function getLangString(lang, id) {
    var strings = langStrings[lang] || loadLangStrings(lang);
    var prop = strings[id];

    if(typeof prop === 'function') {
      Array.prototype.splice.call(arguments, 0, 2);
      return prop.apply(this, arguments);
    }
    
    return prop;
  }

  //function to get the string for the current user language
  function getString(id) {
    var strings = langStrings[userLang] || loadLangStrings(userLang);
    var prop = strings[id];

    if(typeof prop === 'function') {
      Array.prototype.shift.apply(arguments);
      return prop.apply(this, arguments);
    }
    
    return prop;
  }

  getString.get = getLangString; 
  return getString;
}

//function generate a JS code for the strings object
function generateJS(strings) {
  var code = '';

  for(var key in strings) {
    if(!strings.hasOwnProperty(key))
      continue;

    var prop = strings[key];
    code += JSON.stringify(key) + ' : ';
    code += (typeof prop === 'function' ? prop.toString() : prop) + ',\n';
  }

  return 'module.exports = {\n' + code + '}';
}

module.exports = DynamicLoader;
