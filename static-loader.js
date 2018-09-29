//constructor for inline loader
function StaticLoader(context) {
  this.context = context;
  this.langStrings = {};  //output strings to be stored language wise
} 

//generate the output. here we are just adding it to our main language string object
StaticLoader.prototype.generateOutput = function(lang, strings) {
  this.langStrings[lang] = strings;
};

//method to generate the module defenition
//=> module.exports = loaderModule(langStrings)
StaticLoader.prototype.generateModule = function() {
  return 'module.exports = (' + loaderModule.toString() + ')(' + stringify(this.langStrings) + ')';
};

//module funtion. This is the JS function defenition we return from our loader module.
function loaderModule(langStrings) {
  var defaultLang = 'en';
  var userLang = defaultLang;

  try {
    userLang = navigator.language || userLang;
  } catch(error) {}

  /*function to load the strings for the language given.
  the function try to find the best possible property from langString matching the locale.
  for the locale 'pt-br', the function tries to read the object in the order given below; 
  => langStrings['pt-br.js'], langStrings['pt.js'] & langStrings['en'] */
  function loadLangStrings(lang) {
    try {
      if(langStrings[lang])
        return langStrings[lang];

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

//function generate the code for a particular language
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

//function generate a JS code for the strings object
function stringify(langStrings) {
  var code = '';

  for(var lang in langStrings) {
    if(!langStrings.hasOwnProperty(lang))
      continue;

    code += stringifyLang(lang, langStrings[lang]) + ',\n';
  }

  return '{\n' + code + '}\n';
}

module.exports = StaticLoader;
