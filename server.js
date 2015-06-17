var http = require('http');
var express = require('express');
var router = express();
var server = http.createServer(router);
var github = require('./github');
var Cache = require("node-cache");
var Client = require('node-rest-client').Client;

var resultCache = new Cache({
  stdTTL: 599,
  checkperiod: 600
});

var client = new Client();
client.registerMethod('label', "https://api.github.com/repos/${user}/${repo}/labels/${label}", 'get');
client.registerMethod('issues', "https://api.github.com/repos/${user}/${repo}/issues", 'get');

router.get('/:user/:repo/:label', function(req, res) {
  resultCache.get(req.params.user + '/' + req.params.repo + '/' + req.params.label + '/' + (req.query.label || ''), function(err, value) {
    if (err) {
      res.status(500).send(err);
    }
    else {
      if (value != undefined) {
        sendBadge(req, res, value);
      }
      else {
        client.methods.issues(argsForIssues(req), function(data) {
          data = JSON.parse(data);
          if (data.length == undefined) {
            res.status(500).send(data);
            return;
          }
          var badge = {};
          badge.label = req.query.label || req.params.label;
          badge.count = data.length;
          client.methods.label(argsForLabels(req), function(data) {
            data = JSON.parse(data);
            badge.color = data.color;
            resultCache.set(req.params.user + '/' + req.params.repo + '/' + req.params.label + '/' + (req.query.label || ''), badge);
            sendBadge(req, res, badge);
          });

        });
      }

    }
  });
});

function argsForIssues(req) {
  return {
    path: {
      user: req.params.user,
      repo: req.params.repo,
      label: req.params.label
    },
    parameters: {
      labels: req.params.label,
      client_id: github.id,
      client_secret: github.private
    },
    headers: {
      "User-Agent": "Kubuxu for labels"
    }
  };
}

function argsForLabels(req) {
  return {
    path: {
      user: req.params.user,
      repo: req.params.repo,
      label: req.params.label
    },
    parameters: {
      client_id: github.id,
      client_secret: github.private
    },
    headers: {
      "User-Agent": "Kubuxu for labels"
    }
  };
}

function sendBadge(req, res, badge) {
  res.status(303).set('location',"https://img.shields.io/badge/" + badge.label + '-' + badge.count + '-' + badge.color + '.svg?style=' + req.query.style || 'flat').send();
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function() {
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
