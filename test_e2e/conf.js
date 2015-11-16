exports.config = {
   
    seleniumAddress: 'http://localhost:4444/wd/hub',
    capabilities: {
        'browserName': 'chrome',
    },

    specs: ['spec.js'],

    jasmineNodeOpts: {
      showColors: true,
      defaultTimeoutInterval: 30000,
      isVerbose: true
    },

    allScriptsTimeout: 90000,
    framework: 'jasmine2',

    params: {
        //Login data can be changed externally in the command line when you execute protractor by:
        //$ protractor conf.js --params.login.user='yourName' --params.login.password='yourPassword'
        login: {
          user: '',
          password: '',
        },
        ipAddress: 'localhost'
    }
}
