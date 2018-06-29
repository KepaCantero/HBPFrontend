/**---LICENSE-BEGIN - DO NOT CHANGE OR MOVE THIS HEADER
 * This file is part of the Neurorobotics Platform software
 * Copyright (C) 2014,2015,2016,2017 Human Brain Project
 * https://www.humanbrainproject.eu
 *
 * The Human Brain Project is a European Commission funded project
 * in the frame of the Horizon2020 FET Flagship plan.
 * http://ec.europa.eu/programmes/horizon2020/en/h2020-section/fet-flagships
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 * ---LICENSE-END**/
(function() {
  'use strict';

  angular
    .module('videoStreamModule')
    .constant('STREAM_URL', 'stream?topic=')
    .service('videoStreamService', [
      '$q',
      '$log',
      '$http',
      'STREAM_URL',
      'simulationInfo',
      function($q, $log, $http, STREAM_URL, simulationInfo) {
        function checkIfVideoStreamsAvailable() {
          getStreamUrls().then(videoStreams => {
            videoStreamService.videoStreamsAvailable =
              videoStreams && !!videoStreams.length;
          });
        }

        function getStreamUrls() {
          if (
            !simulationInfo.serverConfig.gzweb ||
            !simulationInfo.serverConfig.gzweb.videoStreaming
          ) {
            //usefull for 100% local migration only
            $log.error(
              "'videoStreaming' is missing in your proxy configuration"
            );
            return $q.reject();
          }

          //here we want to get the list of available video streams, and transform them into valid urls
          //unfortunately, the closest we have to a list of available streams if the root html page for
          //the web-video-server. Below we extract the urls from the page into an dictionary topic->url
          return $http
            .get(simulationInfo.serverConfig.gzweb.videoStreaming)
            .then(function(response) {
              return $(response.data)
                .find('li>a:first-child')
                .map(function(i, e) {
                  var url = e.getAttribute('href').match(/\?topic=(.*)$/)[1];
                  return {
                    url: url,
                    fullUrl:
                      simulationInfo.serverConfig.gzweb.videoStreaming +
                      STREAM_URL +
                      url
                  };
                })
                .toArray();
            });
        }

        function getStreamingUrlForTopic(topic) {
          let deferredStreamUrl = $q.defer();
          let videoStreamingUrls = getStreamUrls().then(function(topics) {
            return _.keyBy(topics, 'url');
          });
          videoStreamingUrls.then(urls => {
            let streamUrl = urls[topic] && urls[topic].fullUrl;
            deferredStreamUrl.resolve(streamUrl);
          });

          return deferredStreamUrl.promise;
        }

        let videoStreamService = {
          videoStreamsAvailable: false,
          checkIfVideoStreamsAvailable: checkIfVideoStreamsAvailable,
          getStreamUrls: getStreamUrls,
          getStreamingUrlForTopic: getStreamingUrlForTopic
        };

        videoStreamService.checkIfVideoStreamsAvailable();

        return videoStreamService;
      }
    ]);
})();
