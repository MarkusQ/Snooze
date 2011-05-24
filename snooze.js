var http    = require('http');
var util    = require('util');
var url     = require('url');
var express = require ('../../node/node_modules/express')

var snooze = express.createServer();

function bound_method(object, method) {
  return function() {
    return object[method].apply(object, arguments);
  };
}

/*
snooze.resource = function(path, obj) {
  snooze.get(path, bound_method(obj,'index'));
  snooze.get(path + '/:a..:b.:format?', function(req, res){
    obj.range(req, res, a, b, 
        parseInt(req.params.a, 10),
        parseInt(req.params.b, 10),
        'html' || req.params.format
      );
  });
  snooze.get(path + '/:id', bound_method(obj,'show'));
  snooze.del(path + '/:id', bound_method(obj,'destroy'));
};
*/

Object.prototype.to_link = function() { return [this].join(' ') }
Object.prototype.to_html = function() { return this.to_link() };
Object.prototype.to_json = function() { return this };
Object.prototype.to_format = function(format) {
    switch (format) {
      case 'json':
        return this.to_json();
      case 'link':
        return this.to_link();
      case 'html':
      default:
        return this.to_html();
    }
  }

Array.prototype.to_html = function () { 
    return "<ul>"+
        this.map(function(item){ return '<li>'+item.to_link()+'</li>'; }).join('\n') + 
        '</ul>';
};
Array.prototype.find_first = function (test) {
    for (var i=0; i<this.length; i++) {if (test(this[i])) return this[i];}
    }

Number.prototype.to_link = function() { return "<a href='/number/"+this+"'>"+this+"</a>" };

function Class(name) {
  this.initialize = function (name) {
    this.name = name;
    known_classes.push(this);
    var path = '/'+name;
    snooze.get(path, function(req,res) { res.redirect('/class/'+name); });
    snooze.get(path + '/:a..:b.:format?', function(req, res){
      obj.range(req, res, a, b, 
          parseInt(req.params.a, 10),
          parseInt(req.params.b, 10),
          'html' || req.params.format
        );
    });
    snooze.get(path + '/:id', bound_method(this,'show'));
    snooze.del(path + '/:id', bound_method(this,'destroy'));
  };
  this.initialize(name);
  this.index = function (req, res){ res.send(this.to_html()); };
  this.find = function (id) {
    return this.instances[id] || this.instances.find_first(function (x) { return x.name == id; })
  };
  this.show = function(req, res) {
    res.send(this.find((req.params.id) || ('Cannot find '+name+'/'+req.params.id)).to_html());
  };
  this.destroy = function(req, res){
    var id = req.params.id;
    var destroyed = id in this.instances;
    delete this.instances[id];
    res.send(destroyed ? 'destroyed' : ('Cannot find '+name+'/'+id) );
  };
  this.range = function(req, res, a, b, format){
    res.send(this.instances.slice(a, b + 1).to_format(format));
  };
  this.to_link = function () { return "<a href='/"+this.name+"'>"+this.name+"</a>" };
  this.to_html = function () { 
    return [
      '<h1>'+this.name+'</h1>',
      '<h2>Superclass</h2>',this.constructor.prototype.to_link(),
      '<h2>Methods</h2>',
      '<h2>Instances</h2>',
      (this.instances || "Too numerous to list").to_html()
    ].join('')
  };
};

var known_classes = [];
var class = new Class('class');
class.instances = known_classes;


[Object,String,Number,Array].map(function (cls) {
    x = new Class(cls.name.toLowerCase());
  });
console.log(class.find('number'));
class.find('number').find = parseFloat;
class.find('string').find = toString;


function Enumeration(name,values) {
    this.initialize(name);
    var q = 0;
    this.instances = values.map(function (x) {
        q = q+1;
        return {
          name: x,
          id: q-1,
          to_link: function () { return "<a href='/"+name+"/"+this.id+"'>"+this.name+"</a>" },
          to_html: function () { return name+" "+this.id.to_html()+": "+this.to_link() },
          }
      });
  };
Enumeration.prototype = new Class('enumeration');

var hue = new Enumeration('hue',['red','orange','yellow','green','blue','violet']);

snooze.get('/', function(req, res){ res.redirect("/class") });

snooze.listen(2222);
console.log('Snooze started on port 2222');
