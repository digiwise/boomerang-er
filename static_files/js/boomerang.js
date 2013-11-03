var boomerang = angular.module('gdgBoomerang', ['ngSanitize','ui.bootstrap'])
    .config(function($routeProvider) {
         $routeProvider.
             when("/about",  {templateUrl:'views/about.html', controller:"AboutControl"}).
             when("/news", {templateUrl:'views/news.html', controller:"NewsControl"}).
             when("/events", {templateUrl:'views/events.html', controller:"EventsControl"}).
             when("/photos", {templateUrl:'views/photos.html', controller:"PhotosControl"}).
             otherwise({ redirectTo: '/about' });
    });

boomerang.controller('MainControl', function($scope, Config) {
    $scope.chapter_name = Config.name;
    $scope.google_plus_link = 'https://plus.google.com/' + Config.id;
    $scope.isNavCollapsed = true;
});

boomerang.controller('AboutControl', function( $scope, $http, $location, Config ) {
    $scope.loading = true;
    $scope.$parent.activeTab = "about";
    $scope.cover = Config.cover;
    $http.jsonp('https://www.googleapis.com/plus/v1/people/'+Config.id+'?callback=JSON_CALLBACK&fields=aboutMe%2Ccover%2Cimage%2CplusOneCount&key='+Config.google_api).
        success(function(data){
            console.log(data);
            $scope.desc = data.aboutMe;
            if(data.cover && data.cover.coverPhoto.url){
                $scope.cover.url = data.cover.coverPhoto.url;
            }
            $scope.loading = false;
        });
});

boomerang.controller("NewsControl", function($scope, $http, $timeout, Config) {
    $scope.loading = true;
    $scope.$parent.activeTab = "news";
    $http.
        jsonp('https://www.googleapis.com/plus/v1/people/' + Config.id + '/activities/public?callback=JSON_CALLBACK&maxResults=10&key=' + Config.google_api).
        success(function(response){
            var entries = [];
            for (var i = 0; i < response.items.length; i++) {
                var item = response.items[i];
                var actor = item.actor || {};
                var object = item.object || {};
                // Normalize tweet to a FriendFeed-like entry.
                var item_title = '<b>' + item.title + '</b>';

                var html = [item_title.replace(new RegExp('\n','g'), '<br />')];
                //html.push(' <b>Read More &raquo;</a>');

                var thumbnails = [];

                var attachments = object.attachments || [];
                for (var j = 0; j < attachments.length; j++) {
                    var attachment = attachments[j];
                    switch (attachment.objectType) {
                        case 'album':
                            break;//needs more work
                            var upper = attachment.thumbnails.length > 7 ? 7 : attachment.thumbnails.length;
                            html.push('<ul class="thumbnails">');
                            for(var k=1; k<upper; k++){
                                html.push('<li class="span2"><img src="' + attachment.thumbnails[k].image.url + '" /></li>');
                            }
                            html.push('</ul>');
                            break;
                        case 'photo':
                            thumbnails.push({
                                url: attachment.image.url,
                                link: attachment.fullImage.url
                            });
                            break;

                        case 'video':
                            thumbnails.push({
                                url: attachment.image.url,
                                link: attachment.url
                            });
                            break;

                        case 'article':
                            html.push('<div class="link-attachment"><a href="' +
                                attachment.url + '">' + attachment.displayName + '</a>');
                            if (attachment.content) {
                                html.push('<br>' + attachment.content + '');
                            }
                            html.push('</div>');
                            break;
                        case 'event':
                            console.log(attachment);
                            html.push('<b>' + attachment.displayName + '</b>');
                            html.push('<p>' + attachment.content.replace(new RegExp('\n','g'), '<br />') + '</p>');
                            break;
                        default :
                            console.log(attachment.objectType)
                    }
                }

                html = html.join('');

                var actor_image = actor.image.url;
                actor_image = actor_image.substr(0,actor_image.length-2)+'16';

                var entry = {
                    via: {
                        name: 'Google+',
                        url: item.url
                    },
                    body: html,
                    date: item.updated,
                    reshares: (object.resharers || {}).totalItems,
                    plusones: (object.plusoners || {}).totalItems,
                    comments: (object.replies || {}).totalItems,
                    thumbnails: thumbnails,
                    icon: actor_image
                };

                entries.push(entry);
            }
            $scope.news = entries;
            $timeout(function(){
                gapi.plusone.go();
            });
            $scope.loading = false;
        });

});

boomerang.controller("EventsControl", function( $scope, $http, Config, $filter, $q ) {
  $scope.loading = true;
  $scope.$parent.activeTab = "events";

  $scope.events = {past:[] ,future:[]};

  if (Config.enableEventResources) {
    $http.jsonp(Config.resourcesURL+"?jsonp=JSON_CALLBACK").
    then(
      function(result) {
          console.log('log5');
          console.log(result);

        var matchedResources = [];
        for(var iR=result.data.events.length-1;iR>=0;iR--){
          //console.log('formated --> '+formatedDate);
          //console.log('resourcesCallback --> '+result.data.events[iR].date);

          for(var i=$scope.events.past.length-1;i>=0;i--){
            var formatedDate = $filter('date')($scope.events.past[i].start, 'yyyy-MM-dd');
            if (matchedResources.indexOf(formatedDate) == -1) {
              if (formatedDate == result.data.events[iR].date){
                console.log('matched to '+formatedDate);
                $scope.events.past[i].resources = result.data.events[iR];
                console.log($scope.events.past[i].start);
                matchedResources.push(result.data.events[iR].date);
              }
              else {
                $scope.events.past[i].resources = false;
                console.log('dismatched '+result.data.events[iR].date);
                console.log($scope.events.past[i].start);
              }
            }
          }

        }

        console.log('log4');
        console.log($scope.events.past);
      },
      function(err) {
          return err;
      }
    );
  }

  $http.get("http://gdgfresno.com/gdgfeed.php?id="+Config.id).
    then(
      function(result) {
        var now = new Date();
        for(var i=result.data.length-1;i>=0;i--){
          var start = new Date(result.data[i].start);

          result.data[i].start = start;
          result.data[i].end = new Date(result.data[i].end);

          //console.log('log2');
          //console.log(result.data[i]);

          if (start < now){
            $scope.events.past.push(result.data[i]);
          } else {
            $scope.events.future.push(result.data[i]);
          }
        }
        $scope.loading = false;
        console.log('log3');
        console.log($scope.events.past);
      },
      function(err) {
        console.log('call2Err');
        console.log(err);
      }
    );


});


boomerang.controller("PhotosControl", function( $scope, $http, Config ) {
    $scope.loading = true;
    $scope.$parent.activeTab = "photos";
    $scope.photos = [];

    var pwa = 'https://picasaweb.google.com/data/feed/api/user/'+Config.id+'/albumid/'+Config.pwa_id+'?access=public&alt=json-in-script&kind=photo&max-results=20&fields=entry(title,link/@href,summary,content/@src)&v=2.0&callback=JSON_CALLBACK';
    $http.jsonp(pwa).
        success(function(d){
            var p = d.feed.entry;
            for(var x in p){
                var photo = {
                    link : p[x].link[1].href,
                    src : p[x].content.src,
                    alt : p[x].title.$t,
                    title : p[x].summary.$t
                };
                $scope.photos.push(photo);
            }
            $scope.loading = false;
        });
});