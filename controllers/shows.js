var async = require('async');
var request = require('request');
var rp = require('request-promise-native')
var xml2js = require('xml2js');

const Show = require('../models/shows');

exports.getShowsFromTvdbs = function(req, res) {
  var seriesName = req.query.seriesName
    .toLowerCase()
    .replace(/ /g, '_')
    .replace(/[^\w-]+/g, '');
  var apiKey = '9EF1D1E7D28FDA0B';
  var parser = xml2js.Parser({
    explicitArray: false,
    normalizeTags: true
  });
  var p = rp.get('http://thetvdb.com/api/GetSeries.php?seriesname=' + req.query.seriesName)
    .then(function(body) {
      return new Promise(function(rs, rj) {
        parser.parseString(body, function(err, result) {

          var seriesIds = []
          if (Array.isArray(result.data.series))
            rs(result.data.series.map(function(series) {
              return series.seriesid;
            }))
          else {

          }
            rs([result.data.series.seriesid]);
        });

      })

    }).then(function(seriesIds) {
      var url = 'http://thetvdb.com/api/' + apiKey + '/series/%id%/all/en.xml';
      var URL = [];
      console.log(seriesIds)
      return Promise.all(seriesIds.map(function(id) {
        console.log(url.replace('%id%', id))
        return rp(url.replace('%id%', id));
      }))
    }).then(function(shows) {
      var promiseArray = shows.map(function(show) {
        return new Promise(function(rs, rj) {
          parser.parseString(show, function(err, results) {
            console.error("error",err)
                console.log(results.data.series);
            rs(results.data.series)

          })
        })

      })
      return Promise.all( promiseArray)
    }).then(function(data) {
      res.json({
        data
      })
    })
    .catch(function(error) {
      console.log(error);
      if (error) throw error;
    })
  /*async.waterfall([
    function(callback) {
      request.get('http://thetvdb.com/api/GetSeries.php?seriesname=' + seriesName, function(error, response, body) {
        if (error) return next(error);
        parser.parseString(body, function(err, result) {
          if (!result.data.series) {
            return res.send(400, {
              message: req.query.seriesName + ' was not found.'
            });
          }
          var seriesId = []
          if (Array.isArray(result.data.series))
            seriesId = result.data.series.map(function(series) {
              return series.seriesid
            })
            else {
              seriesId = [result.data.series.seriesid];
            }
          callback(err, seriesId);
        });
      });
    },
    function(seriesId, callback) {
      request.get('http://thetvdb.com/api/' + apiKey + '/series/' + seriesId + '/all/en.xml', function(error, response, body) {
        console.log(response);
        console.log(body);
        if (error) return next(error);
        parser.parseString(body, function(err, result) {
          var series = result.data.series;
          var show = new Show({
            _id: series.id,
            name: series.seriesname,
            airsDayOfWeek: series.airs_dayofweek,
            airsTime: series.airs_time,
            firstAired: series.firstaired,
            genre: series.genre.split('|').filter(Boolean),
            network: series.network,
            overview: series.overview,
            rating: series.rating,
            ratingCount: series.ratingcount,
            runtime: series.runtime,
            status: series.status,
            poster: series.poster
          });
          callback(err, show);
        });
      });
    },
    function(show, callback) {
      var url = 'http://thetvdb.com/banners/' + show.poster;
      request({
        url: url,
        encoding: null
      }, function(error, response, body) {
        show.poster = 'data:' + response.headers['content-type'] + ';base64,' + body.toString('base64');
        callback(error, show);
      });
    }
  ],function(err, show) {
    if (err) return next(err);
    if (!Array.isArray(show))
     show = [show];
    res.json({
      data: show
    })
  });*/
  /*console.log(req.query.seriesName)
  request.get('http://thetvdb.com/api/GetSeries.php?seriesname=' + req.query.seriesName,
      function(err, response, body) {
        if (err) throw err;
        const parser = require('xml2js').Parser({
          explicitArray: false,
          normalizeTags: true
        });
        parser.parseString(body, function(err, result) {
          console.log(typeof result)
          if (!Array.isArray(result.data.series))
           result.data.series = [result.data.series];
          res.json({
            data: result.data.series
          })
        });
      });*/
}

exports.getAllShows = (req, res, next) => {
  var query = Show.find();
  if (req.query.genre) {
    query.where({
      genre: req.query.genre
    });
  } else if (req.query.alphabet) {
    query.where({
      name: new RegExp('^' + '[' + req.query.alphabet + ']', 'i')
    });
  } else {
    query.limit(12);
  }
  query.exec(function(err, shows) {
    if (err) return next(err);
    res.send(shows);
  });
};

exports.getShowById = (req, res, next) => {
  Show.findById(req.params.id, function(err, show) {
    if (err) return next(err);
    res.send(show);
  });
};

exports.postNewShow = (req, res, next) => {
  var seriesName = req.body.showName
    .toLowerCase()
    .replace(/ /g, '_')
    .replace(/[^\w-]+/g, '');
  var apiKey = '9EF1D1E7D28FDA0B';
  var parser = xml2js.Parser({
    explicitArray: false,
    normalizeTags: true
  });

  async.waterfall([
    function(callback) {
      request.get('http://thetvdb.com/api/GetSeries.php?seriesname=' + seriesName, function(error, response, body) {
        if (error) return next(error);
        parser.parseString(body, function(err, result) {
          if (!result.data.series) {
            return res.send(400, {
              message: req.body.showName + ' was not found.'
            });
          }
          var seriesId = result.data.series.seriesid || result.data.series[0].seriesid;
          callback(err, seriesId);
        });
      });
    },
    function(seriesId, callback) {
      request.get('http://thetvdb.com/api/' + apiKey + '/series/' + seriesId + '/all/en.xml', function(error, response, body) {
        if (error) return next(error);
        parser.parseString(body, function(err, result) {
          var series = result.data.series;
          var episodes = result.data.episode;
          var show = new Show({
            _id: series.id,
            name: series.seriesname,
            airsDayOfWeek: series.airs_dayofweek,
            airsTime: series.airs_time,
            firstAired: series.firstaired,
            genre: series.genre.split('|').filter(Boolean),
            network: series.network,
            overview: series.overview,
            rating: series.rating,
            ratingCount: series.ratingcount,
            runtime: series.runtime,
            status: series.status,
            poster: series.poster,
            episodes: []
          });
          _.each(episodes, function(episode) {
            show.episodes.push({
              season: episode.seasonnumber,
              episodeNumber: episode.episodenumber,
              episodeName: episode.episodename,
              firstAired: episode.firstaired,
              overview: episode.overview
            });
          });
          callback(err, show);
        });
      });
    },
    function(show, callback) {
      var url = 'http://thetvdb.com/banners/' + show.poster;
      request({
        url: url,
        encoding: null
      }, function(error, response, body) {
        show.poster = 'data:' + response.headers['content-type'] + ';base64,' + body.toString('base64');
        callback(error, show);
      });
    }
  ], function(err, show) {
    if (err) return next(err);
    show.save(function(err) {
      if (err) {
        if (err.code == 11000) {
          return res.send(409, {
            message: show.name + ' already exists.'
          });
        }
        return next(err);
      }
      var alertDate = Sugar.Date.create('Next ' + show.airsDayOfWeek + ' at ' + show.airsTime).rewind({
        hour: 2
      });
      agenda.schedule(alertDate, 'send email alert', show.name).repeatEvery('1 week');
      res.send(200);
    });
  });
};

exports.postNewSubscribe = (req, res, next) => {
  Show.findById(req.body.showId, function(err, show) {
    if (err) return next(err);
    show.subscribers.push(req.user._id);
    show.save(function(err) {
      if (err) return next(err);
      res.send(200);
    });
  });
};

exports.postUnSubscribe = (req, res, next) => {
  Show.findById(req.body.showId, function(err, show) {
    if (err) return next(err);
    var index = show.subscribers.indexOf(req.user._id);
    show.subscribers.splice(index, 1);
    show.save(function(err) {
      if (err) return next(err);
      res.send(200);
    });
  });
};
