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

snooze.resource = function(path, obj) {
  this.get(path, bound_method(obj,'index'));
  this.get(path + '/:a..:b.:format?', function(req, res){
    obj.range(req, res, a, b, 
        parseInt(req.params.a, 10),
        parseInt(req.params.b, 10),
        'html' || req.params.format
      );
  });
  this.get(path + '/:id', bound_method(obj,'show'));
  this.del(path + '/:id', bound_method(obj,'destroy'));
};


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

Number.prototype.to_link = function() { return "<a href='/Number/"+this+"'>"+this+"</a>" };



function Class(name) {
  this.index = function (req, res){
    res.send(this.instances.to_html());
  };
  this.show = function(req, res){
    res.send(this.instances[req.params.id].to_html() || "error: 'Cannot find hue'");
  };
  this.destroy = function(req, res){
    var id = req.params.id;
    var destroyed = id in this.instances;
    delete this.instances[id];
    res.send(destroyed ? 'destroyed' : 'Cannot find hue');
  };
  this.range = function(req, res, a, b, format){
    res.send(this.instances.slice(a, b + 1).to_format(format));
  }
};

function Enumeration(name,values) {
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
Enumeration.prototype = new Class();

snooze.resource('/hue', new Enumeration('hue',['red','orange','yellow','green','blue','violet']));

snooze.get('/', function(req, res){ res.redirect("/hue") });

snooze.listen(2222);
console.log('Snooze started on port 2222');
