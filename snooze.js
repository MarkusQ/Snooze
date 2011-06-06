//              
//   Preamble
//
require('./me_and_my_monkey_patches');
var http       = require('http');
var util       = require('util');
var url        = require('url');
var express    = require('../../node/node_modules/express')
var ruby_style = require('./ruby_style_class_system.js')
var class      = ruby_style.class
var object     = ruby_style.object
var fs         = require('fs');
var snooze     = express.createServer();

//
//    HTML support
//
function form(obj,method,message,args) {
  return "<form action='"+obj.url()+'/'+message+"' method='"+method+"'><input type=submit value="+message+">"+args.map(function (arg) { 
    return "<lable for='"+arg+"'>"+arg+": </label> <input type='text' id='"+arg+"'>"
    }).join('')+"</form>"
};

function forms_for(target,methods) {
    return methods().map(function (m) { return form(target,m['method']||'get',m['message'],m['args']||[])}).join("<br>\n")
    };

//
//     Rest operations
//

object.instance_methods.url      = function () { return "/"+this.class.name+"/"+this.id() };
object.instance_methods.to_link  = function () { return "<a href="+this.url()+">"+this.to_string()+"</a>" };
object.instance_methods.to_html  = function () { 
    return  [
      '<h1>'+this.to_string()+'</h1>',
      '<h2>Class</h2>'+this.class.to_link(),
      (this.methods && ['<h2>Methods</h2>',forms_for(this,this.methods) ]),
      '<h2>Instances 1</h2>',
      (this.instances || "Too numerous to list").to_html()
      ].join('')
    };

class.instance_methods.bind_REST_class = function (name) {
    var path = '/'+name;
    var this_class = this;
    snooze.get(path, function(req,res) { res.redirect('/class/'+name); });
    snooze.get(path + '/:a..:b.:format?', function(req, res){
        obj.range(req, res, a, b, 
            parseInt(req.params.a, 10),
            parseInt(req.params.b, 10),
            'html' || req.params.format
            );
        });
    console.log('Listening for: '+path+'/:id and routing to '+this.class.name);
    snooze.get(path + '/:id',          this.bound_method('show'));
    snooze.del(path + '/:id',          this.bound_method('destroy'));
    snooze.get(path + '/:id/:message', function(req,res) {
         console.log("name = "+name);
         console.log("this_class = "+this_class.name);
         console.log("id = "+req.params.id);
         var target = this_class.find(req.params.id);
         console.log("target = "+target);
         var result = target[req.params.message].apply(target);
         console.log("result = "+result);
         console.log("result.url = "+result.url());
         res.redirect(result.url());
       });
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
      '<h1>'+this.to_string()+'</h1>',
      this.super && ('<h2>Superclass</h2>'+this.super.to_link()),
      (this.methods && ['<h2>Methods</h2>', forms_for(this,this.methods) ]),
      '<h2>Instances 3</h2>',
      (this.instances || "Too numerous to list").to_html()
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
      (this.class.instance_methods.methods && ['<h2>Methods</h2>', forms_for(this,this.class.instance_methods.methods) ])
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

Number.prototype.url     = function() { return "/number/"+this };

Array.prototype.url    = function () { return "/array/"+encodeURIComponent(this.map(function (x) { return x.url()}).join(',') ) };
Array.prototype.to_link = function () { 
    return "<ul>"+
      this.map(function(item){ return '<li>'+((item && item.to_link && item.to_link()) || item || '<i>undefined</i>')+'</li>' ; }).join('\n') + 
      '</ul>';
  };

String.prototype.url     = function () { return "/string/"+encodeURIComponent(this) };

[String,Number,Array].map(function (cls) {
    var c = class.new(cls.name.toLowerCase(),object,cls.prototype);
    Object.getOwnPropertyNames(c.instance_methods).map( function (x) {
        if (/_/.test(x)) {
            cls.prototype[x] = c.instance_methods[x];
          }
      });
    cls.prototype.class = c;
  });

console.log(class.instances.map(function (c) { return c.name || "no name"; }));
class.find('number').find = parseFloat;
class.find('string').find = decodeURIComponent;
class.find('array').find = function (x) {
    return decodeURIComponent(x).
      split(',').
      map(function (el) {
        var cls_id = el.split('/');
        return class.find(cls_id[1]).find(cls_id[2]);
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
// console.log('hue:',hue.life_story);

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

