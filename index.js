import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
    
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();


//middlewares
app.use(cors());
app.use(express.json()) //req.body
// app.use(express.urlencoded({extended: true}));

app.listen(3000, () => {
    console.log("Servidor escuchando en http://localhost:3000");
});

app.get("/", (req, res) => {
   res.sendFile(path.resolve(__dirname, "./public/index.html"));
});


app.get("/roommates", (req, res) => {
    try {
        let roommates = fs.readFileSync(path.resolve(__dirname, "./data/roommates.json"), "utf8");

        roommates = JSON.parse(roommates);

        res.json({
            roommates
        });
    } catch (error) {
        res.status(500).json({
            message: "Error al intentar obtener los datos de roommates"
        })
    }
});


app.post("/roommate", async (req, res) => {
    try {
        let response = await fetch("https://randomuser.me/api");
        let data = await response.json();
        let usuarioApi = data.results[0];

        let nuevoUsuario = {
            id: uuid().slice(0,6),
            nombre: `${usuarioApi.name.first} ${usuarioApi.name.last}`,
            debe: 0,
            recibe: 0
        };

        //leer los usuarios
        let roommates = fs.readFileSync(path.resolve(__dirname, "./data/roommates.json"), "utf8");

        roommates = JSON.parse(roommates);

        
        roommates.push(nuevoUsuario);
        fs.writeFileSync(path.resolve(__dirname, "./data/roommates.json"), JSON.stringify(roommates, null, 2), "utf-8");
        
        res.status(201).json({
            message: "ok"
        });


    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "No fue posible crear al nuevo usuario."
        })
    }
});



app.get("/gastos", (req, res) => {
    try {
        let gastos = fs.readFileSync(path.resolve(__dirname, "./data/gastos.json"), "utf8");

        gastos = JSON.parse(gastos);

        res.json({
            gastos
        });
    } catch (error) {
        res.status(500).json({
            message: "Error al intentar obtener los gastos"
        })
    }
});


app.post("/gasto", (req, res) => {
    try {

        let {roommate, descripcion, monto} = req.body;

        if(!roommate || !descripcion || !monto){
            return res.status(400).json({
                message: "Debe proporcionar todos los datos requeridos para el gasto."
            })
        }

        let gastos = fs.readFileSync(path.resolve(__dirname, "./data/gastos.json"), "utf8");

        gastos = JSON.parse(gastos);

        let nuevoGasto = {
            id: uuid().slice(0,6),
            roommate,
            descripcion,
            monto
        }

        gastos.push(nuevoGasto);

        fs.writeFileSync(path.resolve(__dirname, "./data/gastos.json"), JSON.stringify(gastos, null, 2), "utf-8");

        divirCuentas();

        res.status(201).json({
            gastos
        });

    } catch (error) {
        res.status(500).json({
            message: "Error al intentar obtener los gastos"
        })
    }
});



//RUTA DELETE GASTO

app.delete("/gasto", (req, res) => {
    try {

        let { id } = req.query;

        if(!id){
            return res.status(400).json({
                message: "Debe proporcionar un id válido."
            })
        };


        let gastos = fs.readFileSync(path.resolve(__dirname, "./data/gastos.json"), "utf8");

        gastos = JSON.parse(gastos);

        //eliminar gasto usando findIndex

        let indexGasto = gastos.findIndex(gasto => gasto.id == id);

        //SI NO ENCUENTRA EL GASTO findIndex retorna -1

        if(indexGasto == -1){
            return res.status(404).json({
                message: "Gasto no encontrado."
            });
        }

        gastos.splice(indexGasto, 1);

        fs.writeFileSync(path.resolve(__dirname, "./data/gastos.json"), JSON.stringify(gastos, null, 2), "utf-8");

        divirCuentas();

        res.json({
            message: "Gasto eliminado correctamente."
        });

    } catch (error) {
        res.status(500).json({
            message: "Error al intentar eliminar el gasto"
        })
    }
});



//actualizar gasto

app.put("/gasto", (req, res) => {
    try {

        let {roommate, descripcion, monto} = req.body;
        let { id }  = req.query;

        if(!roommate || !descripcion || !monto || !id){
            return res.status(400).json({
                message: "Debe proporcionar todos los datos requeridos para editar el gasto."
            })
        }

        let gastos = fs.readFileSync(path.resolve(__dirname, "./data/gastos.json"), "utf8");

        gastos = JSON.parse(gastos);

        let gastoFound = gastos.find(gasto => gasto.id == id);

        if(!gastoFound){
            return res.status(404).json({
                message: "Gasto no encontrado."
            });
        };

        //SE REEMPLAZAN LOS VALORES ANTIGUOS POR LOS NUEVOS
        gastoFound.roommate = roommate;
        gastoFound.descripcion = descripcion;
        gastoFound.monto = monto

        fs.writeFileSync(path.resolve(__dirname, "./data/gastos.json"), JSON.stringify(gastos, null, 2), "utf-8");

        divirCuentas();

        res.status(201).json({
            gastos
        });

    } catch (error) {
        res.status(500).json({
            message: "Error al intentar obtener los gastos"
        })
    }
});


const limpiarDeudas = () => {
    let arrayRoommates = fs.readFileSync(path.resolve(__dirname, "./data/roommates.json"), "utf8");
    arrayRoommates = JSON.parse(arrayRoommates);
    
    for (const roommate of arrayRoommates) {
        roommate.debe = 0;
        roommate.recibe = 0;
    }

    fs.writeFileSync(path.resolve(__dirname, "./data/roommates.json"), JSON.stringify(arrayRoommates, null, 2), "utf-8");
}


//FUNCIÓN CALCULAR GASTOS

const divirCuentas = () => {

    limpiarDeudas();
    //leer los gastos
    let arrayGastos = fs.readFileSync(path.resolve(__dirname, "./data/gastos.json"), "utf8");
    arrayGastos = JSON.parse(arrayGastos);

    //leer los usuarios
    let arrayRoommates = fs.readFileSync(path.resolve(__dirname, "./data/roommates.json"), "utf8");
    arrayRoommates = JSON.parse(arrayRoommates);

    for (const gasto of arrayGastos ) {
        let monto = Number(gasto.monto);
        let cuota = Number((monto / arrayRoommates.length).toFixed(2));

        for (const roommate of arrayRoommates) {
            
            if(gasto.roommate == roommate.nombre){
                roommate.recibe += monto - cuota
            }else {
                roommate.debe += cuota;
            } 
        }
    };

    fs.writeFileSync(path.resolve(__dirname, "./data/roommates.json"), JSON.stringify(arrayRoommates, null, 2), "utf-8");
};


//ESTRUCTURA GASTOS
    //     {
    //     "id": "5513ae",
    //     "roommate": "Mario Rodríguez",
    //     "descripcion": "Articulos de limpieza",
    //     "monto": 15000
    //   }

    //ESTRUCTURA ROOMMATES
    // {
    //     "id": 1,
    //     "nombre": "Mario Rodríguez",
    //     "debe": 0,
    //     "recibe": 0
    //   },