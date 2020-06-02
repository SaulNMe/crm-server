const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PedidoSchema = Schema({
    pedido: {
        type: Array,
        required: true
    },
    total: {
        type: Number,
        required: true
    },
    cliente: {
        type: Schema.Types.ObjectId,
        requied: true,
        ref: 'Cliente'
    },
    vendedor: {
        type: Schema.Types.ObjectId,
        requied: true,
        ref: 'Usuario'
    },
    estado: {
        type: String,
        default: 'PENDIENTE'
    },
    creado: {
        type: Date,
        default: Date.now()
    }
});


module.exports = mongoose.model('Pedido', PedidoSchema);