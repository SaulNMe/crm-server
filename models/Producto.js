const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductosSchema = Schema({
    nombre: {
        type: String,
        required: true,
        trim: true,
    },
    existencia: {
        type: Number,
        require: true
    },
    precio: {
        type: Number,
        required: true,
        trim: true
    },
    creado: {
        type: Date,
        default: Date.now()
    }
})

ProductosSchema.index({ nombre: "text" });

module.exports = mongoose.model('Producto', ProductosSchema);