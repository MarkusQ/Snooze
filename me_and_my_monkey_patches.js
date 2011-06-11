Object.prototype.bound_method = function (method) {
  var self = this
  return function() {
    return self[method].apply(self, arguments);
  };
}

String.prototype.toUnderscore = function(){
    return this.replace(/([A-Z])/g, function(ch) {return "_"+ch.toLowerCase();});
  };

String.prototype.gsub = function (pat,rep) {
    var result = this;
    while (x = pat.exec(result)) {
        var pre  = RegExp.leftContext
        var post = RegExp.rightContext
        result = pre+rep(x)+post
        }
    return result
  }    


Array.prototype.flatten = function () {
    var result = [];
    this.map( function (x) { if (typeof x == "object" && "flatten" in x) { result = result.concat(x.flatten()) } else { result.push(x) } } )
    return result;
  }

Array.prototype.find_first = function (test) {
    for (var i=0; i<this.length; i++) {if (test(this[i])) return this[i];} 
  }

Function.prototype.toString = function () { return "function"; };

