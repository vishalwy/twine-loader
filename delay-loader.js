var loaderUtils = require('loader-utils');

function DelayLoader(context, content) {
  if(!context.emitFile) 
    throw new Error('emitFile is required from module system');

  this.context = context;

  //generate hash value for emiting the cotnent in output folder
  this.url = loaderUtils.interpolateName(context, '[hash]', {content: content});
} 

DelayLoader.prototype.generateOutput = function(lang, strings) {
  this.context.emitFile(this.url + '-' + lang + '.js', generateJS(strings));
};

DelayLoader.prototype.generateModule = function() {
  return 'module.exports = (' + loaderModule.toString() + ')(' + JSON.stringify('./' + this.url) + ')';
};

//The module funtion. This is the JS function defenition we return from our loader module.
//The function try to require the best possible JS file matching the locale.
//For the locale 'pt-br', the function tries to require following in order; '[url]-pt-br', '[url]-pt' & '[url]-en.
function loaderModule(url) {
  var lang = navigator.language;
  var strings = null;

  //function to require the JS file at runtime using eval().
  //if we use require() direcly, Webpack will try to resolve that also, resulting in compilation error.
  var requireJson = function(file) {
    return eval('require("' + file + '")');
  };
  
  try {
    strings = requireJson(url + '-' + lang);
  } catch(error) {}

  try {
    strings = strings || requireJson(url + '-' + lang.split('-')[0]);
  } catch(error) {}
  
  strings = strings || requireJson(url + '-en');

  return function(id) {
    var prop = strings[id];

    if(typeof prop === 'function') {
      Array.prototype.shift.apply(arguments);
      return prop.apply(this, arguments);
    }
    
    return prop;
  };
}

//Function generate a JS code for the strings object
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

module.exports = DelayLoader;