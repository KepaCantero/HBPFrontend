(function() {
  'use strict';

  //recursively mocks the window object using Proxy
  let mockWindow = {
    URL: {
      createObjectURL: jasmine.createSpy('mock_createObjectURL')
    },
    alert: jasmine.createSpy('mock_alert'),
    location: {
      href: null,
      reload: jasmine.createSpy('mock_reload'),
      replace: jasmine.createSpy('mock_replace'),
      path: jasmine.createSpy('mock_path'),
      url: jasmine.createSpy('mock_url')
    }
  };

  let proxies = {};

  let proxyFunction = (target, name) => (...args) => target[name](...args);

  let createProxy = (obj, mock) =>
    new Proxy(
      {},
      {
        set: (target, name, value) => {
          if (mock[name] !== null) obj[name] = value;
        },
        get: (target, name) => {
          if (mock[name]) {
            if (typeof mock[name] == 'function') return mock[name];
            if (!proxies[name])
              proxies[name] = createProxy(obj[name], mock[name]);
            return proxies[name];
          } else if (typeof obj[name] == 'function')
            return proxyFunction(obj, name);

          return obj[name];
        }
      }
    );
  window.onbeforeunload = jasmine.createSpy('mock_onbeforeunload');
  proxies['$window'] = createProxy(window, mockWindow);

  angular.module('$windowMock', []).service('$window', function() {
    return proxies['$window'];
  });
})();
