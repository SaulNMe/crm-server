require('dotenv').config({path: 'variables.env'});

const bcryptjs  = require('bcryptjs');
const jwt       = require('jsonwebtoken');

const Usuario   = require('../models/Usuario');
const Producto  = require('../models/Producto');
const Cliente   = require('../models/Cliente');
const Pedido    = require('../models/Pedido');

const crearToken = (usuario, secret, expiresIn) => {
    const { id, email, nombre, apellido } = usuario;
    return jwt.sign({id, email, nombre, apellido}, secret, {expiresIn});
}

// Resolvers
const resolvers = {
    Query: {
        obtenerUsuario: async (_, {}, ctx) => {
            return ctx.usuario;
        },
        obtenerProductos: async () => {
            try {
                const productos = await Producto.find({});
                return productos;
            } catch (error) {
                console.log(error);
            }
        },
        obtenerProducto: async (_, { id }) => {
            try {
                const producto = await Producto.findById(id);
                if(!producto) {
                    throw new Error('El producto no existe');
                }
                
                return producto;


            } catch (error) {
                console.log(error);
            }
        },
        obtenerClientes: async () => {
            try {
                const clientes = Cliente.find({});
                return clientes;
            } catch (error) {
                console.log(error);
            }
        },
        obtenerClientesVendedor: async (_, {}, ctx) => {
            try {
                const clientes = Cliente.find({vendedor: ctx.usuario.id.toString()});
                return clientes;
            } catch (error) {
                console.log(error);
            }
        },
        obtenerCliente: async (_, { id }, ctx) => {
            try {
                const cliente = await Cliente.findById(id);
                if(!cliente) {
                    throw new Error('El cliente no existe');
                }
                if(cliente.vendedor.toString() !== ctx.usuario.id){
                    throw new Error('No tienes las credenciales');
                }
                return cliente;
            } catch (error) {
                console.log(error);
            }
        },
        obtenerPedidos: async () => {
            try {
                const pedidos  = await Pedido.find({});
                return pedidos;
            } catch (error) {
                console.log(error);
            }
        },
        obtenerPedidosVendedor: async (_, {}, ctx) => {
            try {
                const pedidos  = await Pedido.find({vendedor: ctx.usuario.id}).populate('cliente');
                return pedidos;
            } catch (error) {
                console.log(error);
            }
        },
        obtenerPedido: async (_, { id }, ctx) => {
            // Verificar pedido
            const pedido = await Pedido.findById(id);
            if(!pedido) {
                throw new Error('Pedido no encontrado');
            }
            // Validar usuario
            if(pedido.vendedor.toString() != ctx.usuario.id) {
                throw new Error('No tienes las credenciales');
            }

            // Regresar el resultado
            return pedido;
        },
        obtenerPedidosEstado: async (_, { estado }, ctx) => {
            const pedidos = await Pedido.find({vendedor: ctx.usuario.id, estado});

            return pedidos;
        }, 
        mejoresClientes: async () => {
            const clientes = await Pedido.aggregate([
                { $match : { estado: "COMPLETADO" }},
                { $group : {
                    _id: "$cliente",
                    total: { $sum: "$total" }
                }},
                { $lookup: {
                    from: 'clientes',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'cliente'
                }},
                { $limit: 10 },
                { $sort: {
                    total: -1
                }}
            ]);

            return clientes;
        },
        mejoresVendedores: async () => {
            const  vendedores = await Pedido.aggregate([
                { $match : { estado: "COMPLETADO" }},
                { $group : {
                    _id: "$vendedor",
                    total: { $sum: "$total" }
                }}, {
                    $lookup: {
                        from: 'usuarios',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'vendedor'
                    }
                }, {
                    $limit: 5
                }, {
                    $sort: { total: -1 }
                }
            ]);

            return vendedores;
        },
        buscarProducto: async (_, { texto },) => {
            const productos = await Producto.find({ $text: { $search: texto } });

            return productos;
        }
    },
    Mutation: {
        nuevoUsuario: async (_, { input }) => {
           const { email, password } = input;
           const existeUsuario = await Usuario.findOne({email});
           if(existeUsuario) {
               throw new Error('El usuario ya está registrado');
            }
            
            const salt = await bcryptjs.genSalt(10);
            
            input.password = bcryptjs.hashSync(password, salt);
            
            try {
               const usuario = new Usuario(input);
               await usuario.save();
               return usuario;
           } catch (error) {
               console.log(error);
           }
        },
        autenticarUsuario: async (_, {input}) => {
            const {email, password} = input;
            
            const existeUsuario = await Usuario.findOne({email});
            
            if(!existeUsuario) {
                throw new Error('El usuario no existe');
                
            }

            const rightPassword = await bcryptjs.compare( password, existeUsuario.password);

            if(!rightPassword) {
                throw new Error('El password es incorrecto');
            }

            return {
                token: crearToken(existeUsuario, process.env.SECRET_SEED, '24h')
            }
        },
        nuevoProducto:  async  (_, { input }) => {
            try {
                const producto = new Producto(input);

                //almacenar en bd
                const resProducto = await producto.save();

                return resProducto;
            } catch (error) {
                console.log(error);
            }
        },
        actualizarProducto: async (_, { id, input }) => {
            let producto = await  Producto.findById(id);
            if(!producto) {
                throw new Error('El producto no existe');
            }
            producto = await Producto.findOneAndUpdate({_id: id }, input, {new: true});
            return producto
        },
        borrarProducto:  async(_, { id }) => {
            let producto = await Producto.findById(id);
            if(!producto) {
                throw new Error('El producto no existe');
            }

            await Producto.findOneAndDelete({_id: id});
            return "Producto eliminado";
        },
        nuevoCliente: async (_, {input}, ctx) => {
            const { email } = input;

            // Verificar si el cliente ya está registrado
            const cliente = await Cliente.findOne({email});
            if(cliente) {
                throw new Error("Este cliente ya está registrado");
            }
            // Asignar el vendedor
            
            // Guardarlo en la base de datos
            const nuevoCliente = new Cliente(input);

            try {
                nuevoCliente.vendedor = ctx.usuario.id;
                const res = await nuevoCliente.save();
    
                return res;
                
            } catch (error) {
                console.log(error);
            }
        },
        actualizarCliente: async (_, { id, input }, ctx) => {
            // Verificar si existe o no
            let cliente = await Cliente.findById(id);
            
            if(!cliente) {
                throw new Error('Este cliente no existe');
            }
            if(cliente.vendedor.toString() !== ctx.usuario.id){
                throw new Error('No tienes las credenciales');
            }
            
            cliente = await Cliente.findOneAndUpdate({ _id: id }, input, { new: true });
            return cliente;
            
            // Verificar vendedor
        },
        eliminarCliente: async (_, { id }, ctx) => {
            const cliente = await Cliente.findById(id);
            if(!cliente) {
                throw new Error('Este cliente no existe');
            }
            if(cliente.vendedor.toString() !== ctx.usuario.id){
                throw new Error('No tienes las credenciales');
            }
            await Cliente.findOneAndDelete({_id: id});
            return "Cliente eliminado";
        },
        nuevoPedido: async (_, { input }, ctx) => {
            const { cliente } = input;
            // Verificar si existe el cliente
            const clienteExiste = await Cliente.findById(cliente);
            if(!clienteExiste) {
                throw new Error('Este cliente no existe');
            }

            // Verificar si el cliente es del vendedor
            if(clienteExiste.vendedor.toString() !== ctx.usuario.id){
                throw new Error('No tienes las credenciales');
            }
            // Revisar disponibilidad el stock
            for await (const articulo of input.pedido) {
                const { id, cantidad } =  articulo;
                const producto =  await Producto.findById(id);

                if(articulo.cantidad > producto.existencia) {
                    throw new Error(`El artículo ${producto.nombre} excede la cantidad disponible`);
                } else {
                    producto.existencia = producto.existencia - cantidad;
                    await producto.save();
                }
            }

            // Crear nuevo pedido
            let nuevoPedido = new Pedido(input);

            // Asignar un vendedor
            nuevoPedido.vendedor = ctx.usuario.id;

            // Guardarlo en la base de datos
            const res = await nuevoPedido.save();
            return res;
        },
        actualizarPedido: async (_, { id, input }, ctx) => {
            const { cliente } = input;
            // Verificar si el pedido existe
            const pedido = await Pedido.findById(id);
            if(!pedido) {
                throw new Error("El pedido no existe");
            }

            // Verificar si el cliente existe
            const clienteExiste = await Cliente.findById(cliente);
            if(!clienteExiste) {
                throw new Error('Este cliente no existe');
            }
            // Si el pedido y el cliente pertenece al vendedor
            if(clienteExiste.vendedor.toString() != ctx.usuario.id) {
                throw new Error('No tienes las credenciales');
            }

            // Revisar el stock
            if(input.pedido){
                for await (const articulo of input.pedido) {
                    const { id } = articulo;

                    const producto = await Producto.findById(id);

                    if(articulo.cantidad > producto.existencia) {
                        throw new Error(`El artículo ${producto.nombre} excede la cantidad disponible`);
                    } else {
                        // Restar cantidad a lo disponible
                        producto.existencia -= articulo.cantidad;
                        await producto.save();
                    }
                }
            }

            // Guargar el pedido
            const res = await Pedido.findOneAndUpdate({_id: id}, input, {new: true});
            return res;
        },
        eliminarPedido: async (_, { id }, ctx) => {
            const pedido = await Pedido.findById(id);
            if(!pedido) {
                throw new Error('Este pedido no existe');
            }
            if(pedido.vendedor.toString() !== ctx.usuario.id){
                throw new Error('No tienes las credenciales');
            }
            await Pedido.findOneAndDelete({_id: id});
            return "Pedido eliminado correctamente";
        }
    }
}

module.exports = resolvers;