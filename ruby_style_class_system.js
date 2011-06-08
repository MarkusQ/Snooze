//
//     Ruby-style class based object system
//
var known_classes = [];

function chain(parent,tag) {
    //console.log('parent is ',parent);
    var f = function() { };
    f.prototype = parent;
    var result = new f();
    result.super = parent;
    result.life_story = tag + ' ' + parent.life_story; //(parent && parent.life_story || '!!!');
    known_classes.push([result,parent]);
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
    methods: function () {
        var result = [];
        console.log(this.name+" has methods: "+Object.getOwnPropertyNames(this).join(", "));
        Object.getOwnPropertyNames(this).map(function (x) {
            if (!/^_/.test(x)) {
                result.push({ message: x });
              }
          });
        return result;
      },
    };


var class_instance_methods = chain(object_instance_methods,'cim');

class_instance_methods.initialize = function (name,parent,instance_methods) {
    //this.super.initialize.apply(this);
    //if (!this.instance_methods) this.instance_methods = chain(this.super.instance_methods,'??'); 
    if (instance_methods) {
        var self = this;
        Object.getOwnPropertyNames(instance_methods).map(function (x) {
            self.instance_methods[x.toUnderscore()] = instance_methods[x];
          });
      }
    this.name = name;
    class.instances.push(this);
    this.bind_REST_class(name);
    };
class_instance_methods.bind_REST_class = function (name) { /* stub till we build REST */ };
class_instance_methods.name = 'class';
class_instance_methods.to_string = function () { return this.name };
class_instance_methods.find =  function (id) {
    console.log("Looking for",arguments,"in",this.name);
    var step = (id == '' && class) || this.instances[id] || this.instances.find_first(function (x) { return x.name == id; })
    if (arguments.length == 1) {
        return step
      } else {
        return step.find.apply(step,arguments.slice(1));
      }
    };

var object = chain(class_instance_methods,'ocm');
object.instance_methods = object_instance_methods;
object.instance_methods.class = object;

var class  = chain(object,'ccm');
class.instance_methods = class_instance_methods;
class.instance_methods.class = class;
//class.initialize  = function (/*arguments*/) { console.log('  class.initialize'); };

class.new = function (name,parent,instance_methods) {
    parent = parent || object;
    var result = chain(parent,'['+name+'-cm]');
    result.instance_methods = chain(parent.instance_methods,'['+name+'-im]');
    result.instance_methods.class = result;
    result.initialize.apply(result,arguments);
    return result
    };

class.instances = [];
object.initialize('object');
class.initialize('class');

Object.prototype.life_story = "JSObj";

console.log("class.new should not be the same as object.new",class.new != object.new && 'pass' || 'fail');
console.log( class.life_story);
console.log(object.life_story);

exports.known_classes = known_classes
exports.class         = class
exports.object        = object
