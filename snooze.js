//              
//   Preamble
//
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

//
//    HTML support
//
function form(obj,method,message,args) {
  return "<form action='"+obj.url()+'/'+message+"' method='"+method+"'><input type=submit value="+message+">"+args.map(function (arg) { 
    return "<lable for='"+arg+"'>"+arg+": </label> <input type='text' id='"+arg+"'>"
    }).join('')+"</form>"
};

function forms_for(methods) {
    return methods.map(function (m) { form(this,m['method']||'get',m['message'],m['args']||[])})
    };


//
//     Ruby-style class based object system
//

function chain(parent,tag) {
    //console.log('parent is ',parent);
    var f = function() { };
    f.prototype = parent;
    var result = new f();
    result.super = parent;
    result.life_story = tag + ' ' + parent.life_story;
    return result;
    };


var object_instance_methods = {
    new:    function (/*arguments*/) {
        var result = chain(this,'['+this.name+']');
        result.class = this.class;
        console.log(this.name+'.new');
        //console.log(result);
        //console.log(result.super);
        result.initialize.apply(result,arguments);
        return result;
        },
    life_story: 'oim',
    initialize: function (/*arguments*/) { console.log('  object.instance_methods.initialize'); },
    };


var class_instance_methods = chain(object_instance_methods,'cim');

class_instance_methods.initialize = function (name,instance_methods) {
    console.log(' ',name,'class.instance_methods.initialize');
    //this.super.initialize.apply(this);
    //if (!this.instance_methods) this.instance_methods = chain(this.super.instance_methods,'??'); 
    for (x in instance_methods) { 
         console.log('    copying '+x+' into '+name+'.instance_methods');
         this.instance_methods[x] = instance_methods[x];
         }
    this.name = name;
    class.instances.push(this);
    this.bind_REST_class(name);
    };
class_instance_methods.bind_REST_class = function (name) { /* stub till we build REST */ };
class_instance_methods.name = 'class';
class_instance_methods.to_s = function () { return this.name };
class_instance_methods.find =  function (id) {
    console.log("Looking for",id,"in",this.name);
    return this.instances[id] || this.instances.find_first(function (x) { return x.name == id; })
    };


var object = chain(class_instance_methods,'ocm');
object.instance_methods = object_instance_methods;
object.instance_methods.class = object;

var class  = chain(object,'ccm');
class.instance_methods = class_instance_methods;
class.instance_methods.class = class;

class.new = function (name,parent) {
    parent = parent || object;
    var result = chain(parent,'['+name+'-cm]');
    result.instance_methods = chain(parent.instance_methods,'['+name+'-im]');
    result.instance_methods.class = result;
    (result.initialize || class.initialize).apply(result,arguments);
    return result
    };

class.instances = [];
object.initialize('object');
class.initialize('class');

Object.prototype.life_story = "JSObj";

console.log("class.new should not be the same as object.new",class.new != object.new && 'pass' || 'fail');
console.log( class.life_story);
console.log(object.life_story);


//
//     Rest operations
//

object.instance_methods.url      = function () { return "/"+this.class.name+"/"+this.id() };
object.instance_methods.to_link  = function () { return "<a href="+this.url()+">"+this.to_s()+"</a>" };
object.instance_methods.to_html  = function () { 
    return  [
      '<h1>'+this.to_so()+'</h1>',
      '<h2>Class</h2>'+this.class.to_link(),
      (this.methods && ['<h2>Methods</h2>',forms_for(this.methods) ]),
      '<h2>Instances 1</h2>',
      (this.instances || "Too numerous to list").to_html()
      ].join('')
    };

class.instance_methods.bind_REST_class = function (name) {
    var path = '/'+name;
    snooze.get(path, function(req,res) { res.redirect('/class/'+name); });
    snooze.get(path + '/:a..:b.:format?', function(req, res){
        obj.range(req, res, a, b, 
            parseInt(req.params.a, 10),
            parseInt(req.params.b, 10),
            'html' || req.params.format
            );
        });
    console.log('Listening for: '+path+'/:id');
    snooze.get(path + '/:id', bound_method(this,'show'));
    snooze.del(path + '/:id', bound_method(this,'destroy'));
    };

class.bind_REST_class('class');
object.bind_REST_class('object');

class.instance_methods.to_html = function () { 
    return [
      '<h1>'+this.name+'</h1>',
      this.super && ('<h2>Superclass</h2>'+this.super.to_link()),
      (this.methods && ['<h2>Methods</h2>' + this.methods.map(function (m) { form(this,m['method']||'get',m['message'],m['args']||[])}).join('') ]) || '',
      '<h2>Instances 2</h2>',
      (this.instances || "Too numerous to list").to_html()
    ].join('')
  }


class.instance_methods.show = function(req, res) {
//    res.send(this.find(req.params.id).to_html());
//    res.send((this.find(req.params.id) || ('Cannot find '+this.name+'/'+req.params.id)).to_html()+' in '+this.instances.map(function (x) { return util.inspect(x)}).to_html());
//    console.log(util.inspect(this.find(req.params.id)));
    res.send((this.find(req.params.id) || (('Cannot find '+this.name+'/'+req.params.id)).to_html()+' in '+
      this.instances.map(
        function (x) { return "<b>"+(x.name || "<i>no name</i>")+"</b>"+util.inspect(x)}
      )).to_html()  
    );
  };
class.instance_methods.destroy = function(req, res){
    var id = req.params.id;
    var destroyed = id in this.instances;
    delete this.instances[id];
    res.send(destroyed ? 'destroyed' : ('Cannot find '+name+'/'+id) );
  };
class.instance_methods.range = function(req, res, a, b, format){
    res.send(this.instances.slice(a, b + 1).to_format(format));
  };
class.instance_methods.url =  function () { return "/"+this.name };
class.instance_methods.to_link =  function () { return "<a href='"+this.url()+"'>"+this.name+"</a>" };
class.instance_methods.to_html = function () { return  [
          '<h1>'+this.to_s()+'</h1>',
          this.super && ('<h2>Superclass</h2>'+this.super.to_link()),
          (this.methods && ['<h2>Methods</h2>', forms_for(this.methods) ]),
          '<h2>Instances 3</h2>',
          (this.instances || "Too numerous to list").to_html()
        ].join('')
      };
class.instance_methods.index = function (req, res){ res.send(this.to_html()); };


//
//    Making native objects play too...
//
Object.prototype.url     = function() { return '' };
Object.prototype.to_link = function() { return [this].join(' ') };
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
Object.prototype.bind_REST_class = object.bind_REST_class;

Array.prototype.to_html = function () { 
    return "<ul>"+
        this.map(function(item){ return '<li>'+((item && item.to_link && item.to_link()) || item || '<i>undefined</i>')+'</li>' ; }).join('\n') + 
        '</ul>';
};
Array.prototype.find_first = function (test) {
    for (var i=0; i<this.length; i++) {if (test(this[i])) return this[i];}
    }

Number.prototype.url     = function() { return "/number/"+this };
Number.prototype.to_link = function() { return "<a href='"+this.url()+"'>"+this+"</a>" };


[String,Number,Array].map(function (cls) {
    var x = chain(class)
    x.life_story = cls.name;
    x.instance_methods = cls;
    class.new(cls.name.toLowerCase(),x);
  });

console.log(class.instances.map(function (c) { return c.name || "no name"; }));
class.find('number').find = parseFloat;
class.find('number').methods = [
  { message: 'abs' }
]

class.find('string').find = String.toString;
class.find('array').methods = [
  { message: 'length' }
]

Function.prototype.toString = function () { return "function"; };
//
//  Now start using it...
//
var enumeration = class.new('enumeration')
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

var hue = enumeration.new('hue',['red','orange','yellow','green','blue','violet']);

snooze.get('/', function(req, res){ res.redirect("/class") });

snooze.listen(2222);
console.log('Snooze started on port 2222');
console.log('hue:',hue.life_story);

