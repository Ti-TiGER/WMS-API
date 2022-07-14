var express = require("express");
var cors = require("cors");
var bodyParser = require("body-parser");
const mysql = require("mysql2/promise");
const { request } = require("express");
const PORT = process.env.PORT || 5000;

var connection = {};
var app = express();
var jwt = require("jsonwebtoken");
var jsonParser = bodyParser.json();
const secret = "Fullstack Doodeep work";
const bcrypt = require("bcrypt");
const saltRounds = 10;
app.use(cors());
app.use(express.json());

const create_connection = async () => {
  return await mysql.createConnection({
    host: "lcpbq9az4jklobvq.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    port: "3306",
    user: "wwz7nngvxb09lek6",
    password: "bqnch71ghg5ivpe3",
    database: "rjz14gilfzn22wr9",
  });
};

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];

    jwt.verify(token, secret, (err, users) => {
      if (err) {
        res.status(403);
        res.send({
          status: "forbidden",
          message: "Access Token Invalid",
        });
        return;
      }

      req.users = users;
      next();
    });
  } else {
    res.status(401);
    res.send({
      status: "forbidden",
      message: "No Authorization Header",
    });
  }
};

const { body, validationResult } = require("express-validator");

// app.post("/auth", function (req, res, next) {
//   try {
//     const token = req.headers.authorization.split(" ")[1];
//     var decoded = jwt.verify(token, secret);
//     res.json({ status: "Verified", decoded });
//   } catch (err) {
//     res.json({ status: "error", message: err.message });
//   }
// });

app.post("/auth", authenticateJWT, (req, res, next) => {
  const user_id = req.users.user_id;
  connection.query(
    "SELECT * FROM `users` WHERE `user_id` = ?",
    [user_id],
    function (err, results) {
      res.json(results[0]);
    }
  );
});

app.post("/auth/users", authenticateJWT, (req, res) => {
  const email = req.users.email;
  connection.query(
    "SELECT * FROM `users` WHERE `email` = ?",
    [email],
    function (err, results) {
      res.json(results);
    }
  );
});

app.post("/register", jsonParser, async (req, res, next) => {
  let connection = await create_connection();
  let [rows] = await connection.execute(
    'SELECT email FROM users WHERE email ="' + req.body.email + '"'
  );
  if (rows.length > 0) {
    return res.json({
      status: "registered",
      message: "This email has already been registered.",
      rows,
    });
  }

  let hash_password = await bcrypt.hash(req.body.password, saltRounds);
  // insert new users to database

  let [register, err] = await connection.query(
    "INSERT INTO `users`(`fname`, `lname`, `email`, `password`, `avatar`, `contact`) VALUES (?, ?, ?, ?, ?, ?)",
    [
      req.body.fname,
      req.body.lname,
      req.body.email,
      hash_password,
      req.body.avatar,
      req.body.contact,
    ]
  );

  if (err) {
    return res.json({
      status: "errror",
      message: "some error occurred : ",
      err,
    });
  }

  return res.json({
    status: "ok",
    message:
      "User with user id : " +
      register.insertId +
      " is registered successfully.",
    register,
  });

  // connection
  //   .query(
  //     "INSERT INTO `users`(`fname`, `lname`, `email`, `password`, `avatar`, `contact`) VALUES (?, ?, ?, ?, ?, ?)",
  //     [
  //       req.body.fname,
  //       req.body.lname,
  //       req.body.email,
  //       hash_password,
  //       req.body.avatar,
  //       req.body.contact,
  //     ]
  //   )
  //   .then((results) => {
  //     results.status = "ok";
  //     results.message =
  //       "User with user id : " +
  //       results.insertId +
  //       " is registered successfully.";
  //     res.json(results);
  //     if (err) {
  //       res.json({ status: "error", message: err });
  //     }
  //   });

  // connection
  //   .promise()
  //   .query(
  //     'SELECT email FROM users WHERE email ="' + req.query.email + '"',
  //     function (err, result) {
  //       console.log(result);
  //       if (err) throw err;
  //       if (result.length > 0) {
  //         res.json({
  //           status: "registered",
  //           message: "This email has already been registered.",
  //         });
  //       }

  //       //You will get an array. if no users found it will return.
  //       else {
  //         //Then do your task (run insert query)
  //         bcrypt.hash(req.body.password, saltRounds, function (hash) {
  //           // Store hash in your password DB.
  //           connection
  //             .query(
  //               "INSERT INTO `users`(`fname`, `lname`, `email`, `password`, `avatar`, `contact`) VALUES (?, ?, ?, ?, ?, ?)",
  //               [
  //                 req.body.fname,
  //                 req.body.lname,
  //                 req.body.email,
  //                 hash,
  //                 req.body.avatar,
  //                 req.body.contact,
  //               ]
  //             )
  //             .then((results) => {
  //               results.status = "ok";
  //               results.message =
  //                 "User with user id : " +
  //                 results.insertId +
  //                 " is registered successfully.";
  //               res.json(results);
  //               if (err) {
  //                 res.json({ status: "error", message: err });
  //               }
  //             });
  //         });
  //       }
  //     }
  //   );
});

app.post("/login", jsonParser, function (req, res, next) {
  connection.query(
    "SELECT * FROM users WHERE email=?",
    [req.body.email],
    function (err, users) {
      if (err) {
        res.json({ status: "error", message: err });
        return;
      }
      if (users.length == 0) {
        res.json({ status: "error", message: "no email found" });
        return;
      }
      bcrypt.compare(
        req.body.password,
        users[0].password,
        function (err, isLogin) {
          if (isLogin) {
            var token = jwt.sign({ email: users[0].email }, secret, {
              expiresIn: "1h",
            });
            res.status(200).json({
              status: "success",
              message: "Login successfully",
              token,
              user: users[0],
            });
          } else {
            res.status(400).json({
              status: "error",
              message: "Missing email or password",
            });
          }
        }
      );
    }
  );
});

app.get("/users", function (req, res, next) {
  connection.query("SELECT * FROM `users`", function (err, results, fields) {
    res.json(results);
  });
});

app.get("/users/:user_id", function (req, res, next) {
  const user_id = req.params.user_id;
  connection.query(
    "SELECT * FROM `users` WHERE `user_id` = ?",
    [user_id],
    function (err, results) {
      res.json(results[0]);
      // res.json(err);
    }
  );
});

app.post("/create", async (req, res, next) => {
  let connection = await create_connection();
  let [results] = await connection.query(
    "INSERT INTO `users`(`fname`, `lname`, `email`, `password`, `avatar`, `contact`) VALUES (?, ?, ?, ?, ?, ?)",
    [
      req.body.fname,
      req.body.lname,
      req.body.email,
      req.body.password,
      req.body.avatar,
      req.body.contact,
    ]
  );

  console.log(results);

  return res.json({
    status: "ok",
    message:
      "User with USER_ID : " + results.insertId + " is created successfully.",
    results,
  });
});

app.put("/update", function (req, res, next) {
  connection.query(
    "UPDATE `users` SET `fname`= ?, `lname`= ?, `email`= ?, `password`= ?, `avatar`= ?, `contact`= ? WHERE user_id = ?",
    [
      req.body.fname,
      req.body.lname,
      req.body.email,
      req.body.password,
      req.body.avatar,
      req.body.contact,
      req.body.user_id,
    ],
    function (err, results) {
      results.status = "ok";
      results.user_id = req.body.user_id;
      results.message =
        "User with USER_ID : " + results.user_id + " is updated successfully.";
      res.json(results);
    }
  );
});

app.delete("/delete", function (req, res, next) {
  connection.query(
    "DELETE FROM `users` WHERE user_id = ?",
    [req.body.user_id],
    function (err, results) {
      results.status = "ok";
      results.user_id = req.body.user_id;
      results.message =
        "User with USER_ID : " + results.user_id + " is deleted successfully.";
      res.json(results);
    }
  );
});

app.listen(PORT, async () => {
  console.log("CORS-enabled listening on port " + PORT);
});
