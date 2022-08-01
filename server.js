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

app.post("/auth", function (req, res, next) {
  try {
    const token = req.headers.authorization.split(" ")[1];
    var decoded = jwt.verify(token, secret);
    res.json({ status: "Verified", decoded });
  } catch (err) {
    res.json({ status: "error", message: err.message });
  }
});

// app.post("/auth", authenticateJWT, (req, res, next) => {
//   const user_id = req.users.user_id;
//   connection.query(
//     "SELECT * FROM `users` WHERE `user_id` = ?",
//     [user_id],
//     function (err, results) {
//       res.json(results[0]);
//     }
//   );
// });

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

  let [register] = await connection.query(
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

  return res.json({
    status: "ok",
    message:
      "User with user id : " +
      register.insertId +
      " is registered successfully.",
    register,
  });
});

app.post("/login", jsonParser, async function (req, res, next) {
  let connection = await create_connection();
  let [users] = await connection.query("SELECT * FROM users WHERE email=?", [
    req.body.email,
  ]);

  if (users.length == 0) {
    res.json({ status: "error", message: "no email found" });
    return;
  }

  const match = await bcrypt.compare(req.body.password, users[0].password);
  if (match) {
    var token = jwt.sign({ email: users[0].email }, secret, {
      expiresIn: "1h",
    });
    res.json({
      status: "success",
      message: "Login successfully",
      token,
      user: users[0],
    });
  } else {
    res.json({
      status: "Invalid password",
      message: "Wrong password",
    });
  }
});

// CRUD user in database
app.get("/users", async function (req, res, next) {
  let connection = await create_connection();
  let [rows] = await connection.query("SELECT * FROM `users`");
  return res.json(rows);
});
app.get("/users/:user_id", async function (req, res, next) {
  let connection = await create_connection();
  const user_id = req.params.user_id;
  let [rows] = await connection.query(
    "SELECT * FROM `users` WHERE `user_id` = ?",
    [user_id]
  );
  return res.json(rows[0]);
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
app.put("/update", async function (req, res, next) {
  let connection = await create_connection();
  let [rows, err] = await connection.query(
    "UPDATE `users` SET `fname`= ?, `lname`= ?, `email`= ?, `password`= ?, `avatar`= ?, `contact`= ? WHERE user_id = ?",
    [
      req.body.fname,
      req.body.lname,
      req.body.email,
      req.body.password,
      req.body.avatar,
      req.body.contact,
      req.body.user_id,
    ]
  );
  if (err) {
    res.json({ error: err });
  }
  const id = req.body.user_id;
  return res.json({
    status: "ok",
    message: "User with USER_ID : " + id + " is updated successfully.",
    rows,
  });
});
app.delete("/delete", async function (req, res, next) {
  let connection = await create_connection();
  let [rows, err] = await connection.query(
    "DELETE FROM `users` WHERE user_id = ?",
    [req.body.user_id]
  );
  if (err) {
    res.json({ error: err });
  }
  const id = req.body.user_id;
  return res.json({
    status: "ok",
    message: "User with USER_ID : " + id + " is deleted successfully.",
    rows,
  });
});

// CRUD Products
app.get("/pd", async function (req, res, next) {
  let connection = await create_connection();
  let [rows] = await connection.query("SELECT * FROM `products`");
  return res.json(rows);
});
app.get("/pd/:product_id", async function (req, res, next) {
  let connection = await create_connection();
  const product_id = req.params.product_id;
  let [rows] = await connection.query(
    "SELECT * FROM `products` WHERE `product_id` = ?",
    [product_id]
  );
  return res.json(rows[0]);
});

app.get("/categorizedpd/:category_id", async function (req, res, next) {
  let connection = await create_connection();
  const category_id = req.params.category_id;
  let [rows] = await connection.query(
    "SELECT * FROM `products` WHERE category_id = ?",
    [category_id]
  );
  return res.json(rows);
});

app.post("/createpd", async (req, res, next) => {
  let connection = await create_connection();
  let [results] = await connection.query(
    "INSERT INTO `products`(`product_name`, `description`, `product_picture`, `Quantity`) VALUES (?, ?, ?, ?)",
    [
      req.body.product_name,
      req.body.description,
      req.body.product_picture,
      req.body.Quantity,
    ]
  );
  console.log(results);
  return res.json({
    status: "ok",
    message:
      "Product with id : " + results.insertId + " is created successfully.",
    results,
  });
});
app.put("/updatepd", async function (req, res, next) {
  let connection = await create_connection();
  let [rows, err] = await connection.query(
    "UPDATE `products` SET `product_name`= ?, `description`= ?, `product_picture`= ?, `Quantity`= ?,`category_id`= ? WHERE product_id = ?",
    [
      req.body.product_name,
      req.body.description,
      req.body.product_picture,
      req.body.Quantity,
      req.body.category_id,
      req.body.product_id,
    ]
  );
  if (err) {
    res.json({ error: err });
  }
  const id = req.body.product_id;
  return res.json({
    status: "ok",
    message: "Product with product_id : " + id + " is updated successfully.",
    rows,
  });
});
app.delete("/deletepd", async function (req, res, next) {
  let connection = await create_connection();
  let [rows, err] = await connection.query(
    "DELETE FROM `products` WHERE product_id = ?",
    [req.body.product_id]
  );
  if (err) {
    res.json({ error: err });
  }
  const id = req.body.product_id;
  return res.json({
    status: "ok",
    message: "Product with product_id : " + id + " is deleted successfully.",
    rows,
  });
});

// CRUD Category
// READ All Category
app.get("/category", async function (req, res, next) {
  let connection = await create_connection();
  let [rows] = await connection.query("SELECT * FROM `categories`");
  return res.json(rows);
});

// READ BY ID
app.get("/category/:category_id", async function (req, res, next) {
  let connection = await create_connection();
  const category_id = req.params.category_id;
  let [rows] = await connection.query(
    "SELECT * FROM `categories` WHERE `category_id` = ?",
    [category_id]
  );
  return res.json(rows[0]);
});

// CREATE Category
app.post("/createcategory", async (req, res, next) => {
  let connection = await create_connection();
  let [results] = await connection.query(
    "INSERT INTO `categories`(`category_name`, `image`) VALUES (?, ?)",
    [req.body.category_name, req.body.image]
  );
  console.log(results);
  return res.json({
    status: "ok",
    message:
      "Category with id : " + results.insertId + " is created successfully.",
    results,
  });
});

// UPDATE Category
app.put("/updatecategory", async function (req, res, next) {
  let connection = await create_connection();
  let [rows, err] = await connection.query(
    "UPDATE `categories` SET `category_name`= ?, `image`= ? WHERE category_id = ?",
    [req.body.category_name, req.body.image, req.body.category_id]
  );
  if (err) {
    res.json({ error: err });
  }
  const id = req.body.category_id;
  return res.json({
    status: "ok",
    message: "Category with category_id : " + id + " is updated successfully.",
    rows,
  });
});

// DELETE Category
app.delete("/deletecategory", async function (req, res, next) {
  let connection = await create_connection();
  let [rows, err] = await connection.query(
    "DELETE FROM `categories` WHERE category_id = ?",
    [req.body.category_id]
  );
  if (err) {
    res.json({ error: err });
  }
  const id = req.body.category_id;
  return res.json({
    status: "ok",
    message: "Category with category_id : " + id + " is deleted successfully.",
    rows,
  });
});

// CRUD Tags
// READ ALL Tags
app.get("/tags", async function (req, res, next) {
  let connection = await create_connection();
  let [rows] = await connection.query(
    "SELECT * FROM tags LEFT JOIN products ON tags.product_id = products.product_id"
  );
  return res.json(rows);
});

app.get("/connectedTags", async function (req, res, next) {
  let connection = await create_connection();
  let [rows] = await connection.query(
    "SELECT * FROM tags LEFT JOIN products ON tags.product_id = products.product_id WHERE tags.product_id IS NOT NULL"
  );
  return res.json(rows);
});
// READ BY ID
app.get("/tags/:tag_id", async function (req, res, next) {
  let connection = await create_connection();
  const tag_id = req.params.tag_id;
  let [rows] = await connection.query(
    "SELECT * FROM `tags` WHERE `tag_id` = ?",
    [tag_id]
  );
  return res.json(rows[0]);
});
// CREATE Tags
app.post("/createtag", async (req, res, next) => {
  let connection = await create_connection();
  let [results] = await connection.query(
    "INSERT IGNORE INTO `tags`(`tag_detail`) VALUES (?)",
    [req.body.tag_detail]
  );
  console.log(results);
  return res.json({
    status: "ok",
    message: "Tag with id : " + results.insertId + " is created successfully.",
    results,
  });
});
// UPDATE Tags
app.put("/updatetag", async function (req, res, next) {
  let connection = await create_connection();
  let [rows, err] = await connection.query(
    "UPDATE `tags` SET `product_id`= ? WHERE tag_id = ?",
    [req.body.product_id, req.body.tag_id]
  );
  if (err) {
    res.json({ error: err });
  }
  const id = req.body.tag_id;
  return res.json({
    status: "ok",
    message: "Tag with tag_id : " + id + " is updated successfully.",
    rows,
  });
});
// DELETE Tags
app.delete("/deletetag", async function (req, res, next) {
  let connection = await create_connection();
  let [rows, err] = await connection.query(
    "DELETE FROM `tags` WHERE tag_id = ?",
    [req.body.tag_id]
  );
  if (err) {
    res.json({ error: err });
  }
  const id = req.body.tag_id;
  return res.json({
    status: "ok",
    message: "Tag with tag_id : " + id + " is deleted successfully.",
    rows,
  });
});

app.listen(PORT, async () => {
  console.log("CORS-enabled listening on port " + PORT);
});
