
//  OpenShift sample Node application
var bodyParser = require('body-parser')

var express = require('express'),
    app     = express(),
    morgan  = require('morgan');

var request = require('request');

app.use(express.static("public"));
Object.assign=require('object-assign')
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var todos = ['new'];

var mysql = require('mysql');
var connection = mysql.createConnection({
    host     : 'mysql',
    user     : 'demoadmin',
    password : 'Hello123!',
    database : 'sampledb',
    multipleStatements: true
}); 
    
connection.connect();

app.get('/user/:id', function(req, res) {
    const query = `SELECT username FROM USERS where id = ${req.params.id};`;
    console.log(query);

    connection.query(query, function (error, results, fields) {
        if (error) {
            res.send(error)
            return;
        }

        console.log(results);

        var arr = [];
        results.forEach(e => {
            console.log(e);

            if (e instanceof Object && 'username' in e) {
                arr.push(e.username);
            } else if (e instanceof Array && 'username' in e[0]) {
                arr.push(e[0].username);
            }
        });

        console.log(arr);

        res.send(arr);
    });
});

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null) {
  var mongoHost, mongoPort, mongoDatabase, mongoPassword, mongoUser;
  // If using plane old env vars via service discovery
  if (process.env.DATABASE_SERVICE_NAME) {
    var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase();
    mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'];
    mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'];
    mongoDatabase = process.env[mongoServiceName + '_DATABASE'];
    mongoPassword = process.env[mongoServiceName + '_PASSWORD'];
    mongoUser = process.env[mongoServiceName + '_USER'];

  // If using env vars from secret from service binding  
  } else if (process.env.database_name) {
    mongoDatabase = process.env.database_name;
    mongoPassword = process.env.password;
    mongoUser = process.env.username;
    var mongoUriParts = process.env.uri && process.env.uri.split("//");
    if (mongoUriParts.length == 2) {
      mongoUriParts = mongoUriParts[1].split(":");
      if (mongoUriParts && mongoUriParts.length == 2) {
        mongoHost = mongoUriParts[0];
        mongoPort = mongoUriParts[1];
      }
    }
  }

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;
  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.post('/todo', (req, res) => {
  console.log(`new todo : ${req.body.todo}`);
  todos.push(req.body.todo);
  console.log(`todos: ${todos}`)

  const query = `SELECT username FROM USERS where id = ${req.body.todo};`;
  console.log(query);

  connection.query(query, function (error, results, fields) {
      if (error) {
          // res.send(error)
          console.log(error);
      } else {
        console.log(results);

        results.forEach(e => {
            console.log(e);
  
            if (e instanceof Object && 'username' in e) {
                todos.push(e.username);
            } else if (e instanceof Array && 'username' in e[0]) {
                todos.push(e[0].username);
            }
        });
      }

  });

  res.redirect('/');
});

app.get('/check_feedbacks', (req, res) => {
  let html = '';
  if (todos.length <= 0) {
    html += `<div>No feedbacks yet! </div>`
  }
  for (let i = 0; i < todos.length; i++) {
    html += `<div>${todos[i]}</div>`;
  }
  // html = html.replace(/</gi, '&#60;');
  html += "<br><br>"
  html += "<a href='/'>home</a>";
  console.log(html);
  res.send(html);
});

app.get('/clear_feedbacks', (req, res) => {
  todos = [];
  console.log("Cleared the feedback array");

  console.log("in Initialize FW Rule");
  var alertdata = {
    name: "Initialize CNAF Rule in Twistlock",
    text: "Dummy",
    scan_results: ""
  };
  this.invokeTwistlock(alertdata, function(err, data) {
    if (err) {
      console.log("Failed to initialize CNAF Rule in Twistlock: " + err);
    }
    else {
      console.log("Sucessfully initiaized CNAF rule in Twistlock");
   }
  });
  res.redirect('/');
});

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      if (err) {
        console.log('Error running count. Message:\n'+err);
      }
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});

exports.invokeTwistlock = function(alertdata, cb) {
  var options = {
    'method': 'GET',
    'url': 'https://twistlock-console.eu.ngrok.io/api/v1/current/token',
    'headers': {
      'Authorization': 'Basic YWRtaW46b2NhZG1pbg=='
    }
  };
  request(options, function (error, response) { 
    if (error) {
      console.log("Error in authentication to Twistlock", error);
      cb(error);
    } 
    console.log("Sucessfully authenticated to Twistlock");
    var TwistlockAuthToken = JSON.parse(response.body);
    // console.log("Twistlock Token " + TwistlockAuthToken.token);

    var options = {
      'method': 'PUT',
      'url': 'https://twistlock-console.eu.ngrok.io/api/v1/policies/firewall/app/container',
      'headers': {
        'Authorization': 'Bearer ' + TwistlockAuthToken.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({"_id":"containerAppFirewall","rules":[{"modified":"2020-01-13T08:04:10.776Z","owner":"admin","name":"cnaf_rule_0600","previousName":"","effect":"alert","blacklist":{"advancedProtection":true,"subnets":[]},"whitelistSubnets":[],"libinject":{"sqliEnabled":true,"xssEnabled":true},"headers":{"specs":[]},"resources":{"hosts":["*"],"images":["*"],"labels":["name:acmeair-web-app"],"containers":["*"]},"certificate":{"encrypted":""},"csrfEnabled":true,"clickjackingEnabled":true,"attackToolsEnabled":true,"intelGathering":{"bruteforceEnabled":false,"dirTraversalEnabled":true,"trackErrorsEnabled":false,"infoLeakageEnabled":false,"removeFingerprintsEnabled":true},"shellshockEnabled":true,"malformedReqEnabled":true,"maliciousUpload":{"enabled":false,"allowedFileTypes":[],"allowedExtensions":[]},"portMaps":[{"exposed":0,"internal":8080,"tls":false}]},{"modified":"2020-01-13T08:05:54.989Z","owner":"admin","name":"cnaf_rule_0102","previousName":"","effect":"alert","blacklist":{"advancedProtection":false,"subnets":[]},"whitelistSubnets":[],"libinject":{"sqliEnabled":false,"xssEnabled":false},"headers":{"specs":[]},"resources":{"hosts":["*"],"images":["docker.io/docker:18.05-dind"],"labels":["*"],"containers":["*"]},"certificate":{"encrypted":""},"csrfEnabled":true,"clickjackingEnabled":false,"attackToolsEnabled":false,"intelGathering":{"bruteforceEnabled":false,"dirTraversalEnabled":true,"trackErrorsEnabled":false,"infoLeakageEnabled":false,"removeFingerprintsEnabled":true},"shellshockEnabled":false,"malformedReqEnabled":false,"maliciousUpload":{"enabled":false,"allowedFileTypes":[],"allowedExtensions":[]},"portMaps":[{"exposed":0,"internal":8080,"tls":false}]},{"modified":"2020-01-13T08:05:23.757Z","owner":"admin","name":"cnaf_rule_0782","previousName":"","effect":"alert","blacklist":{"advancedProtection":false,"subnets":[]},"whitelistSubnets":[],"libinject":{"sqliEnabled":false,"xssEnabled":true},"headers":{"specs":[]},"resources":{"hosts":["*"],"images":["docker.io/docker:18.05-dind"],"labels":["*"],"containers":["*"]},"certificate":{"encrypted":""},"csrfEnabled":false,"clickjackingEnabled":false,"attackToolsEnabled":false,"intelGathering":{"bruteforceEnabled":false,"dirTraversalEnabled":true,"trackErrorsEnabled":false,"infoLeakageEnabled":false,"removeFingerprintsEnabled":true},"shellshockEnabled":false,"malformedReqEnabled":false,"maliciousUpload":{"enabled":false,"allowedFileTypes":[],"allowedExtensions":[]},"portMaps":[{"exposed":0,"internal":80,"tls":false}]},{"modified":"2020-01-13T08:04:50.153Z","owner":"admin","name":"cnaf_rule_5809","previousName":"","effect":"alert","blacklist":{"advancedProtection":true,"subnets":[]},"whitelistSubnets":[],"libinject":{"sqliEnabled":false,"xssEnabled":true},"headers":{"specs":[]},"resources":{"hosts":["*"],"images":["docker.io/docker:18.05-dind"],"labels":["*"],"containers":["*"]},"certificate":{"encrypted":""},"csrfEnabled":false,"clickjackingEnabled":false,"attackToolsEnabled":false,"intelGathering":{"bruteforceEnabled":false,"dirTraversalEnabled":true,"trackErrorsEnabled":false,"infoLeakageEnabled":false,"removeFingerprintsEnabled":true},"shellshockEnabled":false,"malformedReqEnabled":false,"maliciousUpload":{"enabled":false,"allowedFileTypes":[],"allowedExtensions":[]},"portMaps":[{"exposed":0,"internal":80,"tls":false}]},{"modified":"2020-01-13T08:03:18.176Z","owner":"admin","name":"cnaf_rule_0493","previousName":"","effect":"alert","blacklist":{"advancedProtection":true,"subnets":[]},"whitelistSubnets":[],"libinject":{"sqliEnabled":false,"xssEnabled":true},"headers":{"specs":[]},"resources":{"hosts":["*"],"images":["docker.io/docker:18.05-dind"],"labels":["*"],"containers":["*"]},"certificate":{"encrypted":""},"csrfEnabled":false,"clickjackingEnabled":false,"attackToolsEnabled":false,"intelGathering":{"bruteforceEnabled":false,"dirTraversalEnabled":true,"trackErrorsEnabled":false,"infoLeakageEnabled":false,"removeFingerprintsEnabled":true},"shellshockEnabled":false,"malformedReqEnabled":false,"maliciousUpload":{"enabled":false,"allowedFileTypes":[],"allowedExtensions":[]},"portMaps":[{"exposed":0,"internal":80,"tls":false}]}],"minPort":30000,"maxPort":31000})
      // {"_id":"containerAppFirewall","rules":[],"minPort":30000,"maxPort":31000}
    };
    request(options, function (error, response) { 
      if (error) {
        console.log("Error connecting to Twistlock..." + error);
        cb(error);
      } 
      console.log(response.body);
      cb(null, "success");
    });
  });
}

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('My Server running on http://%s:%s', ip, port);

module.exports = app ;
