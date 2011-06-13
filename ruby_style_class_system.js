//
//     Ruby-style class based object system
//
var util       = require('util');
var known_classes = [];
var verbose = false;

function chain(parent) {
    //console.log('parent is ',parent);
    var f = function() { };
    f.prototype = parent;
    var result = new f();
    result.super = parent;
    result.my = result;
    known_classes.push([result,parent]);
    return result;
    };

var object_instance_methods = {
    initialize: function (/*arguments*/) { console.log('  object.instance_methods.initialize'); },
    };
var class_instance_methods = chain(object_instance_methods);

class_instance_methods.new = function (/*arguments*/) {
    if (verbose) console.log(this.name+'.new('+util.inspect(arguments).slice(1.80)+'...?)');
    var result = chain(this.instance_methods);
    result.class = this.class;
    result.initialize.apply(result,arguments);
    return result;
  };
class_instance_methods.initialize = function (name,parent,instance_methods) {
    //this.super.initialize.apply(this);
    if (instance_methods) {
        var self = this;
        Object.getOwnPropertyNames(instance_methods).map(function (x) {
            self.instance_methods[x.toUnderscore()] = instance_methods[x];
          });
      }
    if (verbose) console.log('Setting name of '+name);
    this.name = name;
    class.instances.push(this);
    this.bind_REST_class(name);
  };
class_instance_methods.bind_REST_class = function (name) { /* stub till we build REST */ };
class_instance_methods.to_string = function () { return this.name };

var object = chain(class_instance_methods);
object.instance_methods = object_instance_methods;
object.instance_methods.class = object;


var class  = chain(object);
class.instance_methods = class_instance_methods;
class.instance_methods.class = class;

class.new = function (name,parent,instance_methods) {
    if (verbose) console.log("class#new("+name+",'+parent+',instance methods is a "+(typeof instance_methods)+")");
    parent = parent || object;
    var result = chain(parent);
    result.instance_methods = chain(parent.instance_methods);
    result.instance_methods.class = result;
    result.initialize.apply(result,arguments);
    return result
  };

class.instances = [];
class.find =  function (id) {
    //console.log("Looking for",arguments,"in",this.name);
    if (id == '') return class;
    return this.instances.find_first(function (x) { return x.name == id; })
  };


class.initialize('class');
object.initialize('object');
object.name = 'object';
object.find =  function (id) {
    if (verbose) console.log("Looking for",id);
    var result = class;
    id.split('/').map( function (s) {
        if (result.class == class)
            result = result.find(s)
          else if (result.hasOwnProperty(s)) 
            result = result[s]
          else
            console.log('Skipping "'+s+'" of "'+id+'".');
     })
    return result
  };

exports.known_classes = known_classes
exports.class         = class
exports.object        = object
