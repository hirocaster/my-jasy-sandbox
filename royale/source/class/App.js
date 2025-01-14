/**
 * @asset {r/*}
 */
(function(globals, undef) {
    var classes = {
        'default': r.controller.MyPage,
        'mission': r.controller.Mission,
        'gacha'  : r.controller.Gacha
    };

    core.Class('r.App', {
        include: [ r.Observable ],

        construct: function() {
            this.__currentController = undefined;
            this.__configs = {};
        },

        properties: {
            player: {
                type: 'object',
                init: null
            }
        },

        members: {
            getConfig: function(name) {
                return this.__configs[name] || [];
            },

            boot: function() {
                var self = this;
                var bootStarted = Date.now();

                var player = new r.model.Player();
                this.setPlayer(player);

                this.invoke('app.boot.start', bootStarted);

                var ids = [
                    'r/proto/chapters.json',
                    'r/proto/missions.json'
                ];
                core.io.Asset.load(ids, function(assets) {
                    var k, v, obj, tmp, name;
                    for (k in assets) {
                        if (assets.hasOwnProperty(k)) {
                            tmp = k.split('/');
                            if (tmp[tmp.length - 2] === 'proto') {
                                v = assets[k];
                                name = tmp[tmp.length - 1].split('.')[0];
                                this.__configs[name] = JSON.parse(v.text);
                            }
                        }
                    }

                    // TODO
                    r.model.Chapter.init(this);

                    this.invoke('app.boot.complete', Date.now());
                    this.run();
                },this, true); // TODO cache

                $(window).bind('hashchange', function() {
                    self.run();
                });
            },

            run: function() {
                var controllerName, actionName;
                var args = {};
                var snakeToCamel = r.util.String.snakeToCamel;

                if (location.hash) {
                    // #!/controller/:action
                    var tmp = location.hash.substr(3).split('/');
                    controllerName = snakeToCamel(tmp[0]);
                    actionName = tmp[1] ? snakeToCamel(tmp[1]) : 'index';
                    if (tmp.length >= 2) {
                        for (var i = 2; i < tmp.length; i += 2) {
                            var k = tmp[i];
                            var v = tmp[i + 1];
                            args[k] = v;
                        }
                    }
                } else {
                    controllerName = 'default';
                    actionName = 'index';
                }

                var action = actionName + 'Action';
                var klass = classes[controllerName];
                var controller;
                if (this.__currentController === undefined) {
                    this.__currentController = controller = new klass(this);
                } else {
                    if (this.__currentController.constructor.className === klass.className) {
                        controller = this.__currentController;
                    } else {
                        this.__currentController.unregister();
                        this.__currentController = controller = new klass(this);
                    }
                }

                var f = controller[action];
                if (f) {
                    var response = f.call(controller, args);
                    if (response && response.route) {
                        // TODO
                        var extra = response.args;
                        var tmp = [];
                        for (var k in extra) {
                            if (extra.hasOwnProperty(k)) {
                                tmp.push(k);
                                tmp.push(extra[k] || 0);
                            }
                        }
                        var next = '#!/' + response.route + '/' + (tmp.join('/'));
                        location.hash = next;
                        this.run();
                    }
                }
            }
        }
    });
}(this));
