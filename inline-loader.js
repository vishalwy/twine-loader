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
  var defaultLang = 'en';

  try {
    defaultLang = navigator.language || defaultLang;
  } catch(error) {}

  function loadLangStrings(lang) {
    try {
      if(langStrings[lang])
        return langStrings[lang];

      var tempLang = lang.split('-')[0];
      langStrings[lang] = loadLangStrings(lang == tempLang ? 'en' : tempLang); 
    } catch(error) {}

    return langStrings[lang];  
  }
  
  function getLangString(lang, id) {
    var strings = langStrings[lang] || loadLangStrings(lang);
    var prop = strings[id];
    
    if(typeof prop === 'function') {
      Array.prototype.splice.call(arguments, 0, 2);
      return prop.apply(this, arguments);
    }
    
    return prop;
  }

  function getString(id) {
    var strings = langStrings[defaultLang] || loadLangStrings(defaultLang);
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