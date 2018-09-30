# twine-loader
Node module for loading [Twine](https://github.com/scelis/twine) data file

This Webpack loader allows you to directly require the twine data file from JS code and use it as string resources. For example,

```javascript
import strings from '../../assets/strings.txt';

//Let query.defaultLanguage = 'en'; i.e 'en' as the fallback language
//English version of the string
console.log(strings.get('en', 'STUDENT_NAME_MARKS', 'John', 85));

//Portuguese version of the string if it exists; fallback to 'en'
console.log(strings.get('pt', 'STUDENT_NAME_MARKS', 'John', 85));

//Brazilian Portuguese version of the string if it exists; fallback to 'pt'
console.log(strings.get('pt-br', 'STUDENT_NAME_MARKS', 'John', 85));  

//Version of the string based on user's locale; fallback to 'en' 
console.log(strings('STUDENT_NAME_MARKS', 'John', 85)); 
```

## Configuration
```javascript
{
    test: /strings\.txt$/,
    loader: 'twine-loader',

    //loader options
    query: {
        //default language to be used as fallback
        defaultLanguage: 'en',

        //languages to generate/load. defaultLanguage will be added 
        languages: ['en'],   

        //this can be true or false or an options object
        dynamicLoader: {
            //prefix for the files generated, use this to control the file location
            urlPrefix: './[hash]-',

            //function to fetch the url given. default is to require from file system.
            //please not that this is a sync function, so you have to have your strings loaded in advance.
            //return value should be an object containing the string keys, like the one given below.
            //{'STRING_KEY': 'string value' || function(...args) {return 'string value'}, ...} 
            loaderFunc: function(url) {
                //do not use require() direcly, Webpack will try to resolve that also, resulting in exception.
                //use either __non_webpack_require__() or eval('require()').
                return eval('require("' + url + '")');
            }
        }
    }
}
```
With the configuration given above, you can ask Webpack to load any file with the name ```strings.txt``` using twine-loader. In the configuration, you can specify the languages you want to generate the translations for. Please note that the ```query.defaultLanguage``` will alwyas be selected as one of the languages to generate, no matter whether you include it or not. Also, set ```dynamicLoader``` to ```true```, to load the language files at run time using the default options. Alternatively you may supply an object containing the options to fine tune the behvior.  


## Dependency

The loader depends on twine command. But you don’t have to bother installing twine command yourself. The module takes care of it while installing itself. It use the command ```gem install --install-dir gems twine``` to install twine. As you can see, this will result in twine command getting installed under the ‘gems’ folder in the module directory. 


## Under the hood

Behind the scenes, the loader writes the content to a temporary file and then executes twine command with that file to generate JSON files for each language you specify. For example, 
```twine generate-localization-file /var/tmp/XX-INPUT /var/tmp/XX-OUTPUT -l en -f jquery -i all```

The loader then parses the JSON file and generate the Javascript file in the Webpack output. The Javascript file will be named like [hash]-en.js where ‘[hash]’ is the hash of the content. This is done so that the module responsible to load the string at run time can find the appropriate Javascript file matching the locale. 


## Why generate .JS? Why not use .JSON directly?

This is done to interpolate the strings with format specifiers during compile time itself. This will avoid the string interpolation overhead at run time. The idea is to generate functions that returns interpolated string and use it directly. Also, this is done only for the strings containing format specifiers and not all the strings. 
