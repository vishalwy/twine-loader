function InlineLoader(context) {
  this.context = context;
  this.langStrings = {};
} 

InlineLoader.prototype.generateOutput = function(lang, strings) {
  this.langStrings[lang] = strings;
};

InlineLoader.prototype.generateModule = function() {
  return 'module.exports = (' + loaderModule.toString() + ')(' + stringify(this.langStrings) + ')';
};

function loaderModule(langStrings) {
  var lang = navigator.language, strings = null;

  try {
    strings = langStrings[lang];
  } catch(error) {}

  try {
    strings = strings || langStrings[lang.split('-')[0]];
  } catch(error) {}
  
  strings = strings || langStrings['en'];

  return function(id) {
    var prop = strings[id];

    if(typeof prop === 'function') {
      Array.prototype.shift.apply(arguments);
      return prop.apply(this, arguments);
    }
    
    return prop;
  };
}

function stringifyLang(lang, strings) {
  var code = '';

  for(var key in strings) {
    if(!strings.hasOwnProperty(key))
      continue;

    var prop = strings[key];
    code += JSON.stringify(key) + ' : ';
    code += (typeof prop === 'function' ? prop.toString() : prop) + ',\n';
  }

  return '"' + lang + '": {\n' + code + '\n}';
}

//Function generate a JS code for the strings object
function stringify(langStrings) {
  var code = '';

  for(var lang in langStrings) {
    if(!langStrings.hasOwnProperty(lang))
      continue;

    code += stringifyLang(lang, langStrings[lang]) + ',\n';
  }

  return '{\n' + code + '}\n';
}

module.exports = InlineLoader;