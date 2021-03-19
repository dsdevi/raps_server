const router = require("express").Router();
const haversine = require("haversine");
const weatherData = require("../../helpers/weatherData");
const Driver = require("../../models/driver.model");
let DriverSession = require("../../models/driverSession.model");
let EPoints = require("../../models/entrancePoints.model");
let RoadSession = require("../../models/roadSession.model");
let Vehicle = require("../../models/vehicle.model");

router.route("/nearEntrance").post((req, res) => {
  const token = req.body.token;
  const username = req.body.username;
  const selectedVehicle = req.body.regNo;

  DriverSession.find({ _id: token, isDeleted: false })
    .then((data) => {
      if (data.length !== 1 || data[0].isDeleted) {
        return res.json({ success: false, message: "Session error" });
      }
    })
    .catch((err) => {
      return res.json({ success: false, message: "Server error" });
    });

  EPoints.find({ type: "ep" })
    .then((points) => {
      const coords = {
        latitude: parseFloat(req.body.lat),
        longitude: parseFloat(req.body.lng),
      };
      let entranceCoords, distance;
      for (const pointIndex in points) {
        entranceCoords = {
          latitude: parseFloat(points[pointIndex].lat),
          longitude: parseFloat(points[pointIndex].lng),
        };
        distance = haversine(coords, entranceCoords, { unit: "meter" });

        if (distance < 500) {
          Vehicle.findOne({ username: username, regno: selectedVehicle })
            .then((vehicleDetails) => {
              weatherData(req.body.lat, req.body.lng)
                .then((weatherDetails) => {
                  Driver.findOne({ username: username })
                    .then((driverDetails) => {
                      console.log(driverDetails);
                      newRoadSession = new RoadSession({
                        username: username,
                        age: driverDetails.age,
                        isEnded: false,
                        vehicleDetails: {
                          type: vehicleDetails.type,
                          yom: vehicleDetails.yom,
                        },
                        weatherDetails: {
                          main: weatherDetails.main,
                          description: weatherDetails.description,
                        },
                      });
                      newRoadSession
                        .save()
                        .then(() => {
                          return res.json({
                            success: true,
                            message: points[pointIndex].entrance,
                          });
                        })
                        .catch((err) => {
                          return res.json({ success: false, message: err });
                        });
                    })
                    .catch((err) => {
                      return res.json({ succuss: false, message: err });
                    });
                })
                .catch((err) => {
                  return res.json({ success: false, message: err });
                });
            })
            .catch((err) => {
              return res.json({ success: false, message: err });
            });
        } else {
          return res.json({
            success: false,
            message: "Not near any entrances",
          });
        }
      }
    })
    .catch((err) => res.json("ERROR" + err));
});

router.route("/nearDanger").post((req, res) => {
  const username = req.body.username;

  RoadSession.findOne({ isEnded: false, username: username })
    .then((data) => {
      const date = new Date();
      const time = date.getHours() + date.getMinutes() / 100;

      const weather = data.weatherDetails.get("main");

      const month = date.getMonth() + 1;
      const month_cat = month >= 3 && month <= 9 ? "Peak" : "Off Peak";

      const hour = date.getHours();
      const hour_cat =
        hour >= 21 && hour <= 5
          ? "Free of charge"
          : (hour >= 6 && hour <= 8) || (hour >= 16 && hour <= 20)
          ? "Rush"
          : "Normal";
      const drowsiness =
        (hour >= 8 && hour <= 10) ||
        (hour >= 14 && hour <= 16) ||
        hour >= 21 ||
        hour <= 5;

      const vision =
        time >= 19 || time <= 5.29
          ? "Poor"
          : (time >= 5.3 && time <= 6.59) || (time >= 17.3 && time <= 18.59)
          ? "Glare"
          : weather === "Rain"
          ? "Blurred"
          : "Normal";

      const age = data.age;
      const age_cat =
        age >= 17 && age <= 29
          ? "Young"
          : age >= 30 && age <= 49
          ? "Mid"
          : "Older";

      console.log({
        // coords: {lat: req.body.lat, lng:req.body.lng},
        // hour: new Date().getHours(),
        // vehicleDetails: data.vehicleDetails,
        // weatherDetails: data.weatherDetails,
        Vehicle_Type: data.vehicleDetails.get("type"),
        Vision: vision,
        Age_new: age_cat,
        Weather: weather,
        KMPost_new: null,
        day_cat: null,
        month_cat: month_cat,
        Animal_Prob: null,
        hour_cat: hour_cat,
        drowsiness: drowsiness,
        enough_gap: 0,
        Vehicle_Condition: 0,
        Reason_Int: null,
      });
    })
    .catch((err) => {
      console.log(err);
    });

  EPoints.find({ type: { $in: ["dp", "exit"] } })
    .then((points) => {
      const dangerPoints = points.filter((item) => item.type === "dp");
      const exitPoints = points.filter((item) => item.type === "exit");
      const coords = {
        latitude: parseFloat(req.body.lat),
        longitude: parseFloat(req.body.lng),
      };
      let dangerCoords, exitCoords, distance;
      for (const pointIndex in dangerPoints) {
        dangerCoords = {
          latitude: parseFloat(dangerPoints[pointIndex].lat),
          longitude: parseFloat(dangerPoints[pointIndex].lng),
        };
        distance = haversine(coords, dangerCoords, { unit: "meter" });

        if (distance < 500) {
          return res.json({ status: 1, type: dangerPoints[pointIndex].dptype });
        }
      }

      for (const pointIndex in exitPoints) {
        exitCoords = {
          latitude: parseFloat(exitPoints[pointIndex].lat),
          longitude: parseFloat(exitPoints[pointIndex].lng),
        };
        distance = haversine(coords, exitCoords, { unit: "meter" });

        if (distance < 50) {
          return res.json({ status: -1 });
        }
      }
      return res.json({ status: 0 });
    })
    .catch((err) => res.json("ERROR" + err));
});

router.route("/recheckWeather").post((req, res) => {
  const username = req.body.username;
  console.log("UPDATING SESSION");
  RoadSession.findOne({
    username: username,
    isEnded: false,
  })
    .then((session) => {
      weatherData(req.body.lat, req.body.lng)
        .then((weatherDetails) => {
          session.weatherDetails = {
            main: weatherDetails.main,
            description: weatherDetails.description,
          };
          session
            .save()
            .then(() => {
              return res.json({ success: true, message: "Session updated" });
            })
            .catch((err) => {
              return res.json({ success: false, message: err });
            });
        })
        .catch((err) => {
          return res.json({ success: false, message: err });
        });
    })
    .catch((err) => {
      return res.json({ success: false, message: err });
    });
});

router.route("/endSession").post((req, res) => {
  const username = req.body.username;

  RoadSession.findOneAndUpdate(
    { username: username, isEnded: false },
    { isEnded: true }
  )
    .then(() => {
      return res.json({ success: true, message: "Road Session ended" });
    })
    .catch((err) => {
      return res.json({ success: false, message: err });
    });
});

router.route("/list").get((req, res) => {
  EPoints.find()
    .then((points) => res.json(points))
    .catch((err) => res.status(400).json("SERVER_ERROR"));
});

module.exports = router;
