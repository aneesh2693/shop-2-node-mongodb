const mongodb = require('mongodb');
const getDB = require('../util/database').getDB;

const objectId = mongodb.ObjectID;

class User {
  constructor(id, username, email, cart) {
    this._id = id ? new objectId(id) : null;
    this.name = username;
    this.email = email;
    this.cart = cart;
  }

  save() {
    const db = getDB();
    let dbOP;

    if (this._id) {
      dbOP = db.collection('users').updateOne(
        {
          _id: this._id //Checking for id
        },
        {
          $set: this
        }
      );
    }
    else {
      dbOP = db.collection('users').insertOne(this);
    }

    return dbOP.then(result => result)
      .catch(err => {
        console.log(err);
        throw err;
      });
  }

  addToCart(product) {
    const cartProductIndex = this.cart.items.findIndex(cp => {
      return cp.productId.toString() === product._id.toString()
    });
    let newQuantity = 1;
    const updatedCartItems = [...this.cart.items];
    if (cartProductIndex >= 0) {
      newQuantity = this.cart.items[cartProductIndex].quantity + 1;
      updatedCartItems[cartProductIndex].quantity = newQuantity;
    }
    else {
      updatedCartItems.push({
        productId: new objectId(product._id),
        quantity: newQuantity
      })
    }
    const updatedCart = {
      items: updatedCartItems
    };
    const db = getDB();
    return db
      .collection('users')
      .updateOne(
        { _id: new objectId(this._id) },
        { $set: { cart: updatedCart } }
      );
  }

  getCart() {
    const db = getDB();
    const productIds = this.cart.items.map(items => items.productId);
    return db.collection('products')
      .find({
        _id: {
          $in: productIds
        }
      })
      .toArray()
      .then(products => {
        return products.map(p => {
          return {
            ...p,
            quantity: this.cart.items.find(i => {
              return i.productId.toString() === p._id.toString()
            }).quantity
          };
        })
      })
      .catch(err => console.log(err));
  }

  deleteItemFromCart(productId) {
    const updatedCart = this.cart.items.filter(item => {
      return item.productId.toString() !== productId.toString()
    });
    const db = getDB();
    return db
      .collection('users')
      .updateOne(
        { _id: new objectId(this._id) },
        { $set: { cart: { items: updatedCart } } }
      );
  }


  addOrder() {
    const db = getDB();
    return this.getCart()
      .then(products => {
        const order = {
          items: products,
          user: {
            _id: new objectId(this._id),
            name: this.name
          }
        }
        return db.collection('orders').insertOne(order);
      })
      .then(result => {
        this.cart = { items: [] };
        return db
          .collection('users')
          .updateOne(
            { _id: new objectId(this._id) },
            { $set: { cart: { items: [] } } }
          );
      })
      .catch(err => console.log(err));
  }

  getOrders() {
    const db = getDB();
    return db.collection('orders').find({ 'user._id': this._id }).toArray();
  }

  static findById(userId) {
    const db = getDB();
    return db.collection('users')
      .findOne({ _id: new objectId(userId) })
      .then(user => user)
      .catch(err => console.log(err));
  }
}

module.exports = User;