/*

TODO:

  * Give urls get, put, post, etc. methods
  * Give urls parse methods
  * Give strings as_url methods
  * Have url() methods return a url (possibly through helper...?)
  * Invoke dynamic
  * status integration

*/

//              
//   Preamble
//
require('./me_and_my_monkey_patches');
var http       = require('http');
var util       = require('util');
var url_lib    = require('url');
var fs         = require('fs');
var querystring = require('querystring');
var express    = require('express')
var ruby_style = require('./ruby_style_class_system.js')
var class      = ruby_style.class
var object     = ruby_style.object


var snooze     = express.createServer();
snooze.use(express.bodyParser());
    
// The methodOverride middleware allows us
// to set a hidden input of _method to an arbitrary
// HTTP method to support app.put(), app.del() etc
//snooze.use(express.methodOverride());
//snooze.use(express.cookieParser());
//snooze.use(express.session({ secret: "it's raining, it's pooring" }));

//
// Function introspection
//
Function.prototype.signature = function () {
    if (this._signature) return this._signature;
    var signature = [];
    if (this.arity)
        for (var i = 0; i < this.arity(); i++) signature.push('_'+signature.length);
    return signature;
  } 

with (Array.prototype) {
    join._signature    = ['delimiter'];
    push._signature    = ['items'];
    slice._signature   = ['from','to'];
    splice._signature  = ['from','count','replace with'];
    unshift._signature = ['items'];
  }

//Boolean
Boolean.prototype.and      = function (x)   { return this && x; }
Boolean.prototype.or       = function (x)   { return this || x; }
Boolean.prototype.not      = function (x)   { return this != true; }
Boolean.prototype.if       = function (t,e) { return this ? t : e;}
Boolean.prototype.if._signature = ['then','else'];
with (Boolean.prototype) {
    and._signature = ['_0'];
    or._signature = ['_0'];
  }

//

//Date

//Number
Number.prototype.add      = function (x) { return this+x; }
Number.prototype.subtract = function (x) { return this-x; }
Number.prototype.multiply = function (x) { return this*x; }
Number.prototype.divide   = function (x) { return this/x; }
with (Number.prototype) {
    add._signature = ['_0'];
    subtract._signature = ['_0'];
    multiply._signature = ['_0'];
    divide._signature = ['_0'];
  }

Number.prototype.negate   = function () { return -this }
Number.prototype.inverse  = function () { return 1.0/this };
Number.prototype.chr      = function () { return String.fromCharCode(this) };

Number.prototype['lt']     = function (x) { return this <  x }; Number.prototype['lt']._signature = ['_0'];
Number.prototype['le']     = function (x) { return this <= x }; Number.prototype['le']._signature = ['_0'];
Number.prototype['gt']     = function (x) { return this >  x }; Number.prototype['gt']._signature = ['_0'];
Number.prototype['ge']     = function (x) { return this >= x }; Number.prototype['ge']._signature = ['_0'];

//[ 'LN10','PI','E','LOG10E','SQRT2','LOG2E','SQRT1_2','LN2']
//['max','atan2','random','min' ]
['cos','pow','log','tan','sqrt','ceil','asin','abs','exp','round','floor','acos','atan','sin' ].map(function (f) {
    Number.prototype[f] = function () { return Math[f](this) }
  })

//RegExp

//String
String.prototype.split._signature = ['delimiter'];

Object.prototype.known_methods  = function () {
    var self = this;
    var result = [];
    //console.log(this.class.name+" has methods: "+Object.getOwnPropertyNames(this).join(", "));
    Object.getOwnPropertyNames(this).map(function (x) {
        if (!/^_/.test(x)) {
            if (self[x]['signature']) {
                result.push({ message: x, method: "post", args: self[x].signature() });
              } else {
                result.push({ message: x, method: "get" });
              }
          }
      });
    result.sort(function (a,b) { return (a.message < b.message) ? -1 : 1 });
    if (this.super) {
        return [{source:this, methods:result}].concat(this.super.known_methods());
        var result = this.super.known_methods();
        result.push({source:this, methods:result});
        return result;
      } else
        return [{source:this, methods:result}];
   };

//
//    HTML support
//
function div(class,contents) { return "<div class='"+class+"'>"+contents+"</div>"; }
function form(method,url,fields) { return "<form action='"+url+"' method='"+method+"'>"+fields.flatten().join('\n')+"</form>"; }

function message_form(obj,method,message,args) {
    return div("method "+method+"_method",form(method,obj.url()+'/'+message,[
        "<input type=submit value="+message+">",
        args.map(function (arg) {
            var lable = '';
            if (!/^_/.test(arg)) lable = "<lable for='"+arg+"'>"+arg+": </label>";
            return lable+"<input type='text' name='"+arg+"'>"
          })
      ]))
  };

function forms_for(target,methods) {
    return methods.map(function (layer) {
        var cls = layer['source'];
        if (cls._dot_role == 'instance') cls = cls.class;
        return div('section','<h3>'+cls.to_link()+' ('+layer['source']._dot_role+' members)</h3>'+
            layer.methods.map(function (m) {
                var desc = (m.method != "post") ? m.message : (typeof target[m.message] != "function") ? (m.message+" (λ)") : '';
                return desc ? ("<div class='method get_method'><a href='"+target.url()+'/'+m.message+"'>"+desc+"</a></div>") : ""}
              ).join("\n")+
            "<div class=section></div>"+
            layer['methods'].map(function (m) {
                return ((m['method']=='post') ? message_form(target,m['method']||'get',m['message'],m['args']||[]) : '')
              }).join("\n")+
            '')
      }).join("\n")
  };

var css = ["<style>",
    "div.section {",
    "    display: block;",
    "    clear: left;",
    "  }",
    "div.method {",
    "    display: block;",
    "    float: left;",
    "    border: 2px black dotted;",
    "    margin: 10px;",
    "  }",
    "div.get_method {",
    "    background-color:#b0c4de;",
    "  }",
    "div.post_method {",
    "    background-color:#ffa5b0;",
    "  }",
    "div.help_text {",
    "    background-color:#c0d0e4;",
    "  }",
    "</style>"].join("\n")

//
//     Rest operations
//

object.instance_methods.url        = function () { return "/"+this.class.name+"/"+this.id() };
object.instance_methods.id         = function () { return this.toString() };
object.instance_methods.to_link    = function () { return "<a href="+this.url()+">"+this.toString()+"</a>" };
object.instance_methods.to_partial = function () { return this.to_link() };
object.instance_methods.to_title   = function () { return "<h1>"+this.to_partial()+"</h1>" };
object.instance_methods.to_html    = function () { 
    return  [
      this.to_title(),
      '<h2>Class</h2>'+this.class.to_link(),
      (this.known_methods && '<div><h2>Methods</h2>\n'+forms_for(this,this.known_methods())+'</div>'),
      ].join('')
    };

var no_such_object = function () {};
class.instance_methods.bind_REST_class = function (name) {
    var path = '/'+name;
    var this_class = this;
    snooze.get(path, function(req,res) { res.redirect('/class/'+name); });
    console.log('Listening for: '+path+'/:id and routing to '+this.class.name);
    snooze.get(path + '/:id',          this.bound_method('show'));
    snooze.del(path + '/:id',          this.bound_method('destroy'));
    snooze.get(path + '/:id/:message', function(req,res) {
        var message = req.params.message;
        var target = this_class.find(req.params.id);
        if (target == no_such_object) {
            res.writeHeader(400,req.params.id);
            res.write(400,req.params.id);
            res.end();
          } else {
            var result = (target.hasOwnProperty(message) ? target[message] : target.my[message]);
            //console.log(target.class.name,target.to_string(),req.params.message,result.to_string())
            res.redirect(result.url());
          }
      });
    snooze.post(path + '/:id/:message', function(req,res) {
        var message = req.params.message;
        var target = this_class.find(req.params.id);
        var result = (target.hasOwnProperty(message) ? target[message] : target.my[message]);
        var args = [];
        for (arg in req.body) if (req.body.hasOwnProperty(arg)) args.push(object.find(req.body[arg]));
        //console.log(target.class.name,util.inspect(target),req.params.message,util.inspect(result),util.inspect(args));
        result = result.apply(target,args);
        //console.log('result: ',util.inspect(result));
        res.redirect(result.url());
      });
    };

class.bind_REST_class('class');
object.bind_REST_class('object');

class.instance_methods.show = function(req, res) {
    var obj = this.find(req.params.id);
    if (obj != undefined)
        res.send(css+obj.to_html())
      else {
        res.writeHeader(300,this.name + " does not have a '"+req.params.id+'"');
        res.write(this.name + " does not have a '"+req.params.id+'"');
        res.end();
      }
  };
class.instance_methods.destroy = function(req, res){
    var id = req.params.id;
    var destroyed = id in this.instances;
    delete this.instances[id];
    res.send(destroyed ? 'destroyed' : ('Cannot find '+name+'/'+id) );
  };
class.instance_methods.url =  function () { return "/class/"+this.name };
class.instance_methods.to_link =  function () { return "<a href='"+this.url()+"'>"+this.name+"</a>" };
class.instance_methods.to_html = function () { return  [
      this.to_title(),
      this.super && ('<h2>Superclass</h2>'+this.super.to_link()),
      (this.known_methods && ('<div class=section><h2>Methods</h2>\n'+forms_for(this,this.known_methods()))+'</div>'),
      '<div class=section><h2>Instances</h2>',
      (this.instances && this.instances.to_partial() || "Too numerous to list".italics()),
      '</div>'
    ].join('')
  };
class.instance_methods.index = function (req, res){ res.send(this.to_html()); };


//
//    Making native objects play too...
//
Object.prototype.url        = function() { return '' };
Object.prototype.to_link    = function() { return "<a href='"+this.url()+"'>"+this+"</a>" };
Object.prototype.to_partial = function() { return this.to_link() };
Object.prototype.to_title   = function() { return "<h1>"+this.to_partial()+"</h1>" };
Object.prototype.to_html    = function() { return [
      this.to_title(),
      this.class && ('<h2>Class</h2>'+this.class.to_link()),
      (this.class.instance_methods.known_methods && ('<h2>Methods</h2>\n'+forms_for(this,this.class.instance_methods.known_methods())))
    ].join('')
  };
Object.prototype.to_json = function() { return this };
Object.prototype.to_format = function(format) {
    switch (format) {
      case 'json':    return this.to_json();
      case 'link':    return this.to_link();
      case 'partial': return this.to_partial();
      case 'html':   
      default:        return this.to_html();
    }
  }
Object.prototype.bind_REST_class = object.bind_REST_class;
Object.prototype.class = object;
Object.prototype.my = object.instance_methods;

Boolean.prototype.url    = function () { return "/boolean/"+encodeURIComponent(this) };

Array.prototype.url        = function () { return "/array/"+encodeURIComponent(this.map(function (x) { return x.url()}).join(',') ) };
Array.prototype.to_title   = function () { return 
    this.length == 0 ? "<h1>The empty array</h1>" 
  : "<h1>The following "+this.length+"items</h1>"+this.to_partial() 
  };
Array.prototype.to_partial = function () { 
    return "<ul>"+
      this.map(function(item){ return '<li>'+((item && item.to_link && item.to_link()) || item || '<i>undefined</i>')+'</li>' ; }).join('\n') + 
      '</ul>';
  };

Number.prototype.url       = function () { return "/number/"+this };

String.prototype.url       = function () { return "/string/"+encodeURIComponent(this) };

[Array,Boolean,Date,Number,RegExp,String].map(function (cls) {
    var c = class.new(cls.name.toLowerCase(),object,cls.prototype);
    Object.getOwnPropertyNames(c.instance_methods).map( function (x) {
        if (!/^_/.test(x)) {
            cls.prototype[x] = c.instance_methods[x];
          }
      });
    cls.prototype.class = c;
    cls.prototype.my = c.instance_methods;
  });

class.find('boolean').find = function (x) { 1/0; return x == 'true' };
class.find('boolean').instances = [false,true]
class.find('boolean').find._signature = ["name"];


class.find('number').find = parseFloat;
class.find('number').instance_methods.to_string = function () { return this.toString() };
class.find('number').find._signature = ["name"];

class.find('string').find = decodeURIComponent;
class.find('string').find._signature = ["name"];

class.find('array').find = function (x) {
    return decodeURIComponent(x).
      split(',').
      map(function (el) {
        //var cls_id = el.split('/');
        //return class.find(cls_id[1]).find(cls_id[2]);
        return object.find(el);
      });
  };
class.find('array').find._signature = ["name"];

Array.prototype.collect =  function (f) {
    return this.map(function (x) { return f.apply(x,[x]) });
  }

Array.prototype.inject =  function (f) {
    return this.reduce(function (a,b) { return a.send(f,[b]) });
  }

//
//  Now start using it...
//
var lambda = class.new('lambda',class.find('function'));

lambda.find = function (id) {
    var s_b = decodeURIComponent(id).split('->');
    return lambda.new(s_b.shift(),s_b.join('->'));
  };
lambda.find._signature = ["name"];

lambda.instance_methods.initialize = function (sig,body) {
    this._signature = sig;
    this.signature = function () { return sig; }
    this.body = body.split("\n");
  };
lambda.instance_methods.url = function () { return "/lambda/"+encodeURIComponent([this.signature()].flatten().join(',')+'->'+[this.body].flatten().join("\n")) }

var trace_lambdas = false;
lambda.instance_methods.apply = function (self,args) {
    var line = 0;
    var stack = [];
    while (line >= 0 && line < this.body.length) {
        var cmd = this.body[line];
        line = line + 1
        var i = 0;
        if (trace_lambdas) console.log('stack: ',stack.map(function (x) { return x.url(); }).join(' '));
        if (trace_lambdas) console.log('unmodified command:',cmd);
        cmd = cmd.gsub(/\[(\^|-?\d+)\]/,function (m) {
            if (m[1] == '^')
                return stack.pop().url()
              else
                return stack[sb[1]].url();
            });
        if (trace_lambdas) console.log('after substitution:',cmd);
        cmd = cmd.gsub(/\{([^{}]*)\}/,function (m) { return encodeURIComponent(m[1])} )
        if (trace_lambdas) console.log('after encoding:',cmd);
        var m = /^ *(GET|POST) *(.*)/.exec(cmd);
        if (m) {
            var method = m[1];
            var target = m[2]
            if (target[0] != '/') target = self.url() + '/' + target;
            switch (method) {
              case "GET":
                stack.push(object.find(target));
                break;
              case "POST":
                target = url_lib.parse(target,true);
                query = target.query;
                var path = target.pathname.split('/');
                var method = path.pop();
                var target = object.find(path.join('/'));
                var args = [];
         	for (arg in query) if (query.hasOwnProperty(arg)) args.push(object.find(query[arg]));
                stack.push(target[method].apply(target,args));
                break;
              }
          } else 
            if (!/^ *#/.test(cmd)) console.log("Bad step in lambda: ",cmd);
      }
    if (trace_lambdas) console.log("Returning ",stack[stack.length-1].url());
    return stack.pop();
  };
lambda.instance_methods.to_string = function () {
    return 'λ('+[this.signature()].flatten().join(',')+')->\n'+[this.body].flatten().join("\n");
  }
lambda.instance_methods.to_title    = function () { return div('section',this.to_partial()) };
lambda.instance_methods.to_partial  = function () { 
    return '<b>λ</b>('+[this.signature()].flatten().join(',')+')<b>-></b><blockquote>'+
        '<ol><li>'+[this.body].flatten().join("</li>\n<li>")+"\n</li></ol>"+
      "</blockquote>";
  };

class.find('string').instance_methods.goop = lambda.new([],"GET /number/42");
class.find('string').instance_methods.glop = lambda.new([],"GET /number/42\nGET /number/8\nGET /array/{[^],[^]}");
class.find('string').instance_methods.ave = lambda.new([],[
    "GET length",
    "POST split?delemiter={/string/}",
    "POST [^]/collect?function={/lambda/{->POST charCodeAt?loc=/number/0}}",
    "POST [^]/inject?function=/string/add",
    "POST [^]/divide?by=[^]",
    "POST [^]/chr",
  ].join("\n"));

var url=class.new('url',class.find('string'));


var enumeration = class.new('enumeration',class)
enumeration.new = function (name,values) {
    var result = class.new(name,enumeration);
    //this.super.instance_methods.initialize.apply(this,name);
    //class.instance_methods.initialize.apply(this);
    var q = 0;
    result.instances = values.map(function (x) {
      q = q+1;
      return { name: x,  id: q-1 }
      });
    console.log(result.name,result.instances);
    return result;
    };

var http_method = enumeration.new('http_method',['post','get','put','del','head']);

snooze.get('/', function(req, res){ res.redirect("/class") });
//
// Add some more classes
//
var set_by_initialize = 'Should have been set when this object was initialized.';

var help = class.new('help',object,{
    initialize: function (title,url_pattern,body) {
        this.title       = title;
        this.url_pattern = url_pattern;
        this.body        = body;
        help.instances.push(this);
      },
    title: set_by_initialize,
    url_pattern: set_by_initialize,
    body: set_by_initialize,
    id:         function () { return this.title },
    url:        function () { return "/help/"+encodeURIComponent(this.id()) },
    to_link:    function () { return "<a href="+this.url()+">"+this.title+"</a>" },
    to_title:   function () { return this.to_partial() },
    to_partial: function () { return div('help_text',"<h4>"+this.title+"</h4>"+this.body) }
  });
help.instances = [];
help.find =  function (id) {
    if (id == '') return help;
    return this.instances.find_first(function (x) { return x.id() == id; })
  };

fs.readFile('./help.zzd', 'utf8', function (err, data) {
    if (err) throw err;
    data.split('HELP').map(function (s) {
         var parsed = / *(.+): *(.+)([^]*)/.exec(s);
         if (parsed) {
             help.new(parsed[2],parsed[1],parsed[3]);
           }
      });
    console.log(help.find('/class/class'));
  });

var status = class.new('status',object,{
    initialize: function (code,name,description) {
        this.code = code;
        this.name = name;
        this.description = description;
      },
    code: set_by_initialize,
    name: set_by_initialize,
    description: set_by_initialize
  });

fs.readFile('./statuses.zzd', 'utf8', function (err, data) {
    if (err) throw err;
    data.split('STATUS').map(function (s) {
         var parsed = / *([\d_]+): *(.*)([^]*)/.exec(s);
         if (parsed) {
             status.new(parsed[1],parsed[2],parsed[3]);
           }
      });
  });

//
//
//
snooze.listen(2222);
snooze.on('request', function (req,res) {
    console.log('Request from ',req.connection.remoteAddress,' for ',req.url);
  });
console.log('Snooze started on port 2222');

// <link rel="shortcut icon" href="favicon.ico" >
function serve_binary(file_name,mime_type) {
    return function(req, res){
        fs.readFile(file_name, "binary", function(err, contents) {  
            if (err) {  
                res.writeHead(500, {"Content-Type": "text/plain"});  
                res.write(err + "\n");  
              } else {    
                res.writeHead(200, {'Content-Type': 'image/png' });
                res.end(contents,"binary");
              }
          })
      }
  };


require('./graphviz_class_hierarchy').draw_class_hierarchy("classes","png",ruby_style.known_classes, function () {
    snooze.get('/class_picture.png', serve_binary('classes.png','image/png') );
    });
snooze.get('/favicon.ico', serve_binary('classes.png','image/x-icon') );

console.log('Should be 17: ',  util.inspect(object.find('number/17')));
console.log('Should be "17": ',util.inspect(object.find('string/17')));
console.log('Should be [1,7,"17"]: ',util.inspect(object.find('array/number%2F1,number%2F7,string%2F17')));
