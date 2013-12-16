/* jshint -W117, loopfunc:true, scripturl:true, expr:true */
// ==Taberareloo==
// {
//   "name"        : "ParamCleaner for Taberareloo"
// , "description" : "ParamCleaner for Taberareloo"
// , "include"     : ["background", "content"]
// , "match"       : ["*://*/*"]
// , "version"     : "0.1.0"
// , "downloadURL" : "http://yungsang.github.io/ParamCleaner-for-Taberareloo/paramcleaner.for.taberareloo.tbrl.js"
// }
// ==/Taberareloo==

(function (win) {
  'use strict';

  if (inContext('background')) {
    var DATABASE_URL = "https://rawgithub.com/azu/ParamCleaner_GM/master/data.json";

    if (!Patches['util.wedata.tbrl.js']) {
      Patches.install('https://raw.github.com/YungSang/patches-for-taberareloo/master/utils/util.wedata.tbrl.js', true);
    }

    var items = [];

    var timer = setInterval(function () {
      if (typeof Wedata === 'undefined') {
        return;
      }
      clearInterval(timer);
      var database = new Wedata.Database('paramcleaner-for-taberareloo', DATABASE_URL);
      database.get().addCallback(function (data) {
        items = JSON.parse(data);
      });
    }, 500);

    TBRL.setRequestHandler('ParamCleaner_loadSiteInfo', function (req, sender, func) {
      func(items);
    });

    return;
  }

//   querystring.parse(url.parse(location.href).query);

  function getParamsStr(url) {
    var re = /[?#]([^#]+)/;
    var matched = url.match(re);
    return matched ? matched[1] : null;
  }

  function getParamsReplaceStr(url, str) {
    var re = /[?#]([^#]+)/;
    return url.replace(re, str);
  }

  function getParams(url) {
    var r = [];
    var paramsStr = getParamsStr(url);
    if (paramsStr) {
      paramsStr.split('&').forEach(function (i) {
        r.push(i.split('='));
      });
    }
    return r;
  }

  function paramsJoin(params) {
    return params.map(
      function (i) {
        return i.join('=');
      }).join('&');
  }

  function removeUtmParams(url, data) {
    /*
     http://wedata.net/databases/UrlCleaner/items
     live
     URL に残しておきたいパラメーター名を指定します。マッチした場合は指定したパラメーター以外は削除します。
     kill
     URL から消し去りたいパラメーター名を指定します。マッチしなかったパラメーターは残ります。
     live と kill を指定していた場合 live のほうが優先されます。
     */
    var rescues = typeof data.live == "string" && data.live.split(" ");
    var killers = typeof data.kill == "string" && data.kill.split(" ");
    var params = getParams(url);
    if (params.length === 0) {
      return url;
    } else {
      var filteredParams = [];
      // liveなパラメーターの検査
      if (rescues && (rescues.length > 0) && (rescues !== '')) {
        // console.log(rescues + "<< live");
        filteredParams = params.filter(function (val, index, array) {
          var paramName = val[0];
          // console.log(paramName + " << Name -live");
          for (var i = 0, len = rescues.length; i < len; i++) {
            // パラーメータ名とliveにするものが一致 -falseは省略
            if (paramName === rescues[i]) {
              return true;
            }
          }
        });
      }
      // live合った場合はkillの処理はしない
      if (filteredParams.length === 0) {
        // killなパラメータの検査
        if (killers && (killers.length > 0) && (killers !== '')) {
          // killなパラメータの検査
          filteredParams = params.filter(function (val, index, array) {
            var paramName = val[0];
            for (var i = 0, len = killers.length; i < len; i++) {
              // console.log(paramName + " << Name -kill " + killers[i] + " - " + killers.length);
              // パラーメータ名とkillが違うものは残る
              if (paramName === killers[i]) {
                return false;
              }
            }
            return true; // 一個もマッチしなかったら残すパラメーター
          });
        }
      }
      // console.log(filteredParams + "<< filteredParams");
      if (filteredParams.length === 0) {
        return getParamsReplaceStr(url, '');
      } else {
        return getParamsReplaceStr(url, '?' + paramsJoin(filteredParams));
      }
    }
  }

  function tryReplaceState(data) {
    var nURL = location.href;
    if (!(new RegExp(data.url).test(nURL))) {
      return;
    }
    var cleanURL = removeUtmParams(nURL, data);// paramを取り除く

    if (nURL !== cleanURL) {
      if (win.history) {
        history && history.replaceState(null, document.title, cleanURL);
      } else {
        location.href = cleanURL;
      }
    }
  }

  chrome.runtime.sendMessage(TBRL.id, {
    request  : "ParamCleaner_loadSiteInfo"
  }, function (items) {
    items.forEach(function (item) {
      tryReplaceState(item.data);
    });
  });
})(window || this);