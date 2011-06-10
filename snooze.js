//              
//   Preamble
//
require('./me_and_my_monkey_patches');
var http       = require('http');
var util       = require('util');
var url        = require('url');
var fs         = require('fs');
var querystring = require('querystring');
var express    = require('../../node/node_modules/express')
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
String.prototype.split._signature = ['delimiter'];

Array.prototype.join._signature = ['delimiter'];
Array.prototype.push._signature = ['items'];
Array.prototype.slice._signature = ['from','to'];
Array.prototype.splice._signature = ['from','count','replace with'];
Array.prototype.unshift._signature = ['items'];

//Boolean

//Date

//Number
Number.prototype.add = function (x) { console.log(util.inspect(this),'+',util.inspect(x)); return this+x; }
Number.prototype.add._signature = ['_0'];

//RegExp

//String

Object.prototype.known_methods  = function () {
    var self = this;
    var result = [];
    //console.log(this.class.name+" has methods: "+Object.getOwnPropertyNames(this).join(", "));
    Object.getOwnPropertyNames(this).map(function (x) {
        if (!/^_/.test(x)) {
            if (typeof self[x] == "function") {
                result.push({ message: x, method: "post", args: self[x].signature() });
              } else {
                result.push({ message: x, method: "get" });
              }
          }
      });
    if (this.super) {
        return [{source:this, methods:result}].concat(this.super.known_methods());
        var result = this.super.known_methods();
        result.push({source:this, methods:result});
        return result;
      } else
        return [{source:this, methods:result}];
   };

//
// Add some more classes
//
var set_by_initialize = 'Should have been set when this object was initialized.';

var help = class.new('help',object);

var status = class.new('status',object,{ //);
    initialize: function (code,name,description) {
        //console.log("status#initialize("+code+",'"+name+"',description("+(description||'').length+")");
        //this.super.initialize.apply(this);
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
        return div('section','<h3>'+cls.to_link()+' ('+layer['source']._dot_role+' methods)</h3>'+
            layer['methods'].map(function (m) {
                return message_form(target,m['method']||'get',m['message'],m['args']||[])
              }).join("\n"))
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
    "</style>"].join("\n")

//
//     Rest operations
//

object.instance_methods.url      = function () { return "/"+this.class.name+"/"+this.id() };
object.instance_methods.id       = function () { return this.toString() };
object.instance_methods.to_link  = function () { return "<a href="+this.url()+">"+this.toString()+"</a>" };
object.instance_methods.to_html  = function () { 
    return  [
      '<h1>'+this.to_string()+'</h1>',
      '<h2>Class</h2>'+this.class.to_link(),
      (this.known_methods && '<div><h2>Methods</h2>\n'+forms_for(this,this.known_methods())+'</div>'),
      '<div><h2>Instances 1</h2>',
      (this.instances || "Too numerous to list").to_link(),
      '</div>'
      ].join('')
    };

class.instance_methods.bind_REST_class = function (name) {
    var path = '/'+name;
    var this_class = this;
    snooze.get(path, function(req,res) { res.redirect('/class/'+name); });
    console.log('Listening for: '+path+'/:id and routing to '+this.class.name);
    snooze.get(path + '/:id',          this.bound_method('show'));
    snooze.del(path + '/:id',          this.bound_method('destroy'));
    snooze.get(path + '/:id/:message', function(req,res) {
         var target = this_class.find(req.params.id);
         var result = target[req.params.message];
         res.redirect(result.url());
       });
    snooze.post(path + '/:id/:message', function(req,res) {
         var target = this_class.find(req.params.id);
         var result = target[req.params.message];
         var args = [];
         for (arg in req.body) if (req.body.hasOwnProperty(arg)) args.push(object.find(req.body[arg]));
         console.log(util.inspect(target),req.params.message,util.inspect(result),util.inspect(args));
         result = result.apply(target,args);
         res.redirect(result.url());
       });
    };

class.bind_REST_class('class');
object.bind_REST_class('object');

class.instance_methods.to_html = function () { 
    return [
      '<h1>'+this.name+'</h1>',
      this.super && ('<h2>Superclass</h2>'+this.super.to_link()),
      (this.known_methods && ['<h2>Methods</h2>' + this.known_methods.map(function (m) { message_form(this,m['method']||'get',m['message'],m['args']||[])}).join('') ]) || '',
      '<h2>Instances 2</h2>',
      (this.instances || "Too numerous to list").to_html()
    ].join('')
  }


class.instance_methods.show = function(req, res) {
    var obj = this.find(req.params.id);
    if (obj)
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
class.instance_methods.url =  function () { return "/"+this.name };
class.instance_methods.to_link =  function () { return "<a href='"+this.url()+"'>"+this.name+"</a>" };
class.instance_methods.to_html = function () { return  [
      '<h1>'+this.to_string()+'</h1>',
      this.super && ('<h2>Superclass</h2>'+this.super.to_link()),
      (this.known_methods && ('<div class=section><h2>Methods</h2>\n'+forms_for(this,this.known_methods()))+'</div>'),
      '<div class=section><h2>Instances 3</h2>',
      (this.instances && this.instances.to_html() || "Too numerous to list".italics()),
      '</div>'
    ].join('')
  };
class.instance_methods.index = function (req, res){ res.send(this.to_html()); };


//
//    Making native objects play too...
//
Object.prototype.url     = function() { return '' };
Object.prototype.to_link = function() { return "<a href='"+this.url()+"'>"+this+"</a>" };
Object.prototype.to_html = function() { return [
      '<h1>'+this.to_link()+'</h1>',
      this.class && ('<h2>Class</h2>'+this.class.to_link()),
      (this.class.instance_methods.known_methods && ('<h2>Methods</h2>\n'+forms_for(this,this.class.instance_methods.known_methods())))
    ].join('')
  };
Object.prototype.to_json = function() { return this };
Object.prototype.to_format = function(format) {
    switch (format) {
      case 'json':   return this.to_json();
      case 'link':   return this.to_link();
      case 'html':   
      default:       return this.to_html();
    }
  }
Object.prototype.bind_REST_class = object.bind_REST_class;
Object.prototype.class = object;

Number.prototype.url       = function () { return "/number/"+this };

Array.prototype.url      = function () { return "/array/"+encodeURIComponent(this.map(function (x) { return x.url()}).join(',') ) };
Array.prototype.to_link  = function () { 
    return "<ul>"+
      this.map(function(item){ return '<li>'+((item && item.to_link && item.to_link()) || item || '<i>undefined</i>')+'</li>' ; }).join('\n') + 
      '</ul>';
  };

String.prototype.url     = function () { return "/string/"+encodeURIComponent(this) };

[Array,Boolean,Date,Number,RegExp,String].map(function (cls) {
    var c = class.new(cls.name.toLowerCase(),object,cls.prototype);
    Object.getOwnPropertyNames(c.instance_methods).map( function (x) {
        if (!/^_/.test(x)) {
            cls.prototype[x] = c.instance_methods[x];
          }
      });
    cls.prototype.class = c;
  });

console.log(class.instances.map(function (c) { return c.name || "no name"; }));

class.find('number').find = parseFloat;
class.find('number').instance_methods.to_string = function () { return this.toString() };

class.find('string').find = decodeURIComponent;

class.find('array').find = function (x) {
    return decodeURIComponent(x).
      split(',').
      map(function (el) {
        //var cls_id = el.split('/');
        //return class.find(cls_id[1]).find(cls_id[2]);
        return object.find(el);
      });
  };

Function.prototype.toString = function () { return "function"; };

//
//  Now start using it...
//
var enumeration = class.new('enumeration',class)
enumeration.instance_methods.initialize = function (name,values) {
    console.log('  enumeration.instance_methods.initialize');
    //this.super.instance_methods.initialize.apply(this,name);
    //class.instance_methods.initialize.apply(this);
    var q = 0;
    this.instances = values.map(function (x) {
      q = q+1;
      return { name: x,  id: q-1 }
      });
    console.log(this.name,this.instances);
    };

//var hue = enumeration.new('hue',['red','orange','yellow','green','blue','violet']);

snooze.get('/', function(req, res){ res.redirect("/class") });

snooze.listen(2222);
console.log('Snooze started on port 2222');

require('./graphviz_class_hierarchy').draw_class_hierarchy("classes","png",ruby_style.known_classes, function () {
    snooze.get('/class_picture.png', function(req, res){
        fs.readFile('classes.png', "binary", function(err, contents) {  
            console.log(contents.length," bytes in classes.png");
            if (err) {  
                res.writeHead(500, {"Content-Type": "text/plain"});  
                res.write(err + "\n");  
              } else {    
                res.writeHead(200, {'Content-Type': 'image/png' });
                res.end(contents,"binary");
              }
          });
      });
    });

console.log('Should be 17: ',  util.inspect(object.find('number/17')));
console.log('Should be "17": ',util.inspect(object.find('string/17')));
console.log('Should be [1,7,"17"]: ',util.inspect(object.find('array/number%2F1,number%2F7,string%2F17')));
