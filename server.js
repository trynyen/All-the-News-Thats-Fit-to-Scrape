var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var mongojs = require("mongojs");


// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

if (process.env.MONGODB_URI) {
	mongoose.connect(process.env.MONGODB_URI);
}
else {
mongoose.connect("mongodb://localhost/newsdb", { useNewUrlParser: true });
}

// Routes
app.get("/", function (req, res) {
    // res.send("Welcome to Florida Man Times")
    res.redirect("/articles");
})

// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
    // First, we grab the body of the html with axios
    axios.get("https://www.reddit.com/r/FloridaMan/").then(function (response) {
        // Then, we load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(response.data);
        console.log("Num of articles:", $("article").length);
        // Now, we grab every h2 within an article tag, and do the following:
        $("article").each(function (i, element) {
            // Save an empty result object
            var result = [];
            var title = $(element).find("h3").text();
            // console.log(title);
            var link = $(element).find("a._3jOxDPIQ0KaOWpzvSQo-1s").attr("href");
            // console.log(link);
            result.push({
                title: title,
                link: link
            });

            console.log(result);
            // Create a new Article using the `result` object built from scraping
            db.Article.create(result)
                .then(function (dbArticle) {
                    // View the added result in the console
                    console.log(dbArticle);
                })
                .catch(function (err) {
                    // If an error occurred, log it
                    console.log(err);
                });
        });

        // Send a message to the client
        res.redirect("/articles");
    });
});



// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
    // Grab every document in the Articles collection
    db.Article.find({})
        .then(function (dbArticle) {
            // If we were able to successfully find Articles, send them back to the client
            res.render("index", { dbArticle: dbArticle });
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

app.get("/articles/:id", function (req, res) {
    // Grab every document in the Articles collection
    db.Article.find({ _id: req.params.id })
        .populate("note")
        .then(function (dbArticle) {
            // If we were able to successfully find Articles, send them back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

app.post("/articles/:id", function (req, res) {
    db.Note.create(req.body)
    .then(function(dbNote){
        return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    // Grab every document in the Articles collection
        .then(function (dbArticle) {
            // If we were able to successfully find Articles, send them back to the client
            res.json(dbArticle);
        })
        .catch(function (err) {
            // If an error occurred, send it to the client
            res.json(err);
        });
});

app.put("/saved/:id", function(req,res){
    db.Article.update({_id:req.params.id})
    .then(function(err,data){
        console.log(data)
        if (data.issaved) {
            db.Article.findOneAndUpdate({}, {$set: {issaved: false}}, {new: true}, function(err, data) {
                res.redirect("/articles");
            });
        }
        else {
            db.Article.findOneAndUpdate({}, {$set: {issaved: true}})
        }
    })
    
})

app.get("/saved", function(req, res) {
	db.Article.find({issaved: true}, null, {sort: {created: -1}}, function(err, data) {
		if(data.length === 0) {
			res.render("404", {message: "You have not saved any article"});
		}
		else {
			res.render("saved", {saved: data});
		}
	});
});

// app.post("/delete/:id", function(req,res){
//     db.Article.remove({_id:req.params.id})
//     .then()
// })
// Start our server so that it can begin listening to client requests.
app.listen(PORT, function () {
    // Log (server-side) when our server has started
    console.log("Server listening on: http://localhost:" + PORT);
});
// Connect to the Mongo DB