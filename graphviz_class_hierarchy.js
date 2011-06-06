var fs = require('fs');
var sys = require('sys')
var exec = require('child_process').exec;

function class_hierarchy_dot(known_classes) {
    function find_class(name) {
        return known_classes.flatten().find_first(function (x) { return x.name == name });
      }
    var object = find_class('object');
    var class  = find_class('class');
    function auto_inc(prefix) {
        var count = 0;
        return function () {
            count += 1;
            return prefix+"_"+count;
          }
        }
    var new_node    = auto_inc('node'), 
        new_cluster = auto_inc('cluster');
    function if_not_set(obj,prop,val) {
        if (!obj.hasOwnProperty(prop)) {
            if (typeof val == 'function') { val = val(); }
            obj[prop] = val;
          }
        }
    function dot_node_name(obj) {
        if_not_set(obj,"_dot_node_name",new_node);
        return obj._dot_node_name;
      }
    function direct_methods(obj) {
        var result = [];
        Object.getOwnPropertyNames(obj).map( function (x) { 
            if (obj.hasOwnProperty(x) && /^[^_]/.test(x)) { result.push(x); }
          });
        return result;
      }
    function dot_subgraph_for(obj) {
        if (obj.hasOwnProperty('instance_methods') && !obj.hasOwnProperty('_dot_subgraph')) {
            obj._dot_subgraph = true;
            if_not_set(obj,                 '_dot_role',"{class\\nmethods\\n|"+direct_methods(obj).join("\\l")+"\\l}");
            if_not_set(obj.instance_methods,'_dot_role',"{instance\\nmethods\\n|"+direct_methods(obj.instance_methods).join("\\l")+"\\l}");
            return "subgraph cluster_"+new_cluster()+" {\n"+
              "    graph [label="+obj.name+',bb="", bgcolor=lightgoldenrodyellow];\n'+
              "    "+dot_node_name(obj)+"\n"+
              "    "+dot_node_name(obj.instance_methods)+"\n"+
              "  }"
          } else {
            return ''
          }
      }
    function dot_properties_for(obj) {
        var result = [];
        if (obj.hasOwnProperty("_dot_role")) {
            result.push('label="'+obj._dot_role+'"');
          }
        return dot_node_name(obj)+" ["+result.join(",")+"]"
      }
    var clusters = known_classes.map(function (pair){
        var child = pair[0],parent = pair[1];
        return dot_subgraph_for(child) + dot_subgraph_for(parent)
        })
    var chains = known_classes.map(function (pair){
        var child = pair[0],parent = pair[1];
        var flags = '';
        if (child == object && parent == class.instance_methods) { flags = " [weight=2]"; }
        return dot_node_name(child) + " -> " + dot_node_name(parent) + flags;
        })
    var properties = known_classes.map(function (pair){
        var child = pair[0],parent = pair[1];
        return [dot_properties_for(child),dot_properties_for(parent)].join("\n    ")
        })
    return [
        'digraph snooze {',
        '    graph [ratio=fill, overlap=false, ranksep=1, bgcolor=gray85]',
        '    node [label=N, fillcolor=white, shape=record, style=filled]',
        '    edge [headport=nw, tailport=s, color=blue]',
        "    "+clusters.join("\n    "),
        "    "+chains.join("\n    "),
        "    "+properties.join("\n    "),
        '  }'
      ].join("\n")
  };

exports.draw_class_hierarchy = function (file_root,format,known_classes,callback) {
    fs.writeFile(file_root+".dot", class_hierarchy_dot(known_classes), function(err) {
        if (err) {
            console.log(err);
          } else {
            exec("dot -o "+file_root+"."+format+" -T "+format+" "+file_root+".dot", function (error, stdout, stderr) {
                if (err) { console.log(err) } else { callback() }
              });
          }
      })
  }; 

