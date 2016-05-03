var moment = require("moment");
var mongodb = require("mongodb");

/*

	STRUCTURE OF ADVERTISEMENT DEFINITION:

	[{
		"principal": {
			"name": "Testcompany",
			"mail": "contact@testcompany.com"
		},
		"geofence": {
			// valid geojson	
		},
		"mobile": {
			"banner": {
				"img": "path",
				"link": "https://"
			},
			"lastserved": null,
			"servecount": 0,
			"bannerclicks": 0
		},
		"desktop": {
			"banner": {
				"img": "path",
				"link": "https://"
			},
			"lastserved": null,
			"servecount": 0,
			"bannerclicks": 0
		}
	}]

 */

var collection;

module.exports = {

	// SET COLLECTION
	// sets the mongodb collection for ad banner storage
	setCollection: function(c) {
		collection = c;
	},

	// NEXT AD
	// returns the next advertisement result
	// location = [lat,lon]
	// device = mobile|desktop
	nextAd: function(location, device, callback) {

		// a collection must be set
		if (!collection) {
			return callback("setCollection(collection) must be called with a valid mongodb collection!");
		}

		var deviceProjection = {};
		deviceProjection[device + ".banner"] = true;

		var deviceSorting = {};
		deviceSorting[device + ".lastserved"] = -1;

		// try to find the best advertisement possible
		collection.find({
			"geofence": {
				"$geoIntersects": {
					"$geometry": {
						"type": "point",
						"coordinates": location
					}
				}
			}
		})
			.sort(deviceSorting)
			.project(deviceProjection)
			.limit(1)
			.next(function(err, result) {

				// oh, oh!
				if (err) return callback(err);

				var updateSet = {};
				updateSet[device + ".lastserved"] = moment.utc().toDate();

				var updateIncr = {};
				updateIncr[device + ".servecount"] = 1;

				// update the serving time and click count
				collection.update({
					"_id": result._id
				}, {
					"$set": updateSet,
					"$inc": updateIncr
				});

				return callback(null, result[device].banner);
			});
	},

	// CLICK AD
	// increment the click counter of an ad
	"clickAd": function(id, device, callback) {

		// a collection must be set
		if (!collection) {
			return callback("setCollection(collection) must be called with a valid mongodb collection!");
		}

		var updateIncr = {};
		updateIncr[device + ".bannerclicks"] = 1;

		// update the banner click count 
		collection.update({
			"_id": new mongodb.ObjectID(id)
		}, {
			"$inc": updateIncr
		}, callback);
	}
};