import { Request, Response } from "express";
import pool from "../connection";
import jwt from 'jsonwebtoken';

const nodemailer = require("nodemailer");

interface OTP {
  otp: string;
  expires: number;
}

class UsuarioController {

  private otps: Record<string, OTP> = {};

  constructor() {
    this.login = this.login.bind(this);
    this.generateOtp = this.generateOtp.bind(this);
    this.verifyOtp = this.verifyOtp.bind(this);
  }

  // Obtener todos los usuarios de una empresa
  public async obtenerUsuarios(req: Request, res: Response) {
    const {idEmpresa} = req.params
    const usuarios = await pool.query("SELECT u.*, a.nombre as nombreArea from usuario as u LEFT JOIN area as a ON u.areaFk = a.id WHERE u.empresaFk = ?",idEmpresa);
    if (usuarios.length > 0) {
      return res.json(usuarios);
    }
  }

  // Obtener empleados de un área
  public async obtenerEmpleadosArea (req: Request, res: Response){
    const { idArea } = req.params;
    const empleados = await pool.query("SELECT * FROM usuario WHERE areaFk = ?",[idArea]);
    if (empleados.length > 0) {
      res.json(empleados);
    }else{
      res.status(404).json({ text: "Seleccione otra área, esta no tiene empleados" });
    }
  }

  // Ver un usuario en específico
  public async verUsuario(req: Request, res: Response): Promise<any> {
    const { id } = req.params;
    const usuario = await pool.query(
      "SELECT * FROM usuario WHERE id = ?",[id]
    );
    if (usuario.length > 0) {
      return res.json(usuario[0]);
    }
    res.status(404).json({ text: "El usuario no existe" });
  }

  // Verificar el email de un usuario en específico
  public async obtenerUsuarioEmail(req: Request, res: Response): Promise<any> {
    const { email } = req.params;
    const usuario = await pool.query(
      "SELECT id, email FROM usuario WHERE email = ?",[email]
    );
    if (usuario.length > 0) {
      return res.json(usuario[0]);
    }
    res.status(404).json({ text: "El email no está registrado" });
  }

  // Obtener credenciales de acceso del usuario
  public async obtenerCredenciales(req: Request, res: Response): Promise<any> {
    const { id } = req.params;
    const usuario = await pool.query(
      "SELECT email, password FROM usuario WHERE id = ?",
      [id]
    );
    if (usuario.length > 0) {
      return res.json(usuario[0]);
    }
    res.status(404).json({ text: "El usuario no existe" });
  }

  // Registrar usuario
  public async registrarUsuario(req: Request, res: Response): Promise<void> {
    try {
      const usuario = req.body;

      const result = await pool.query("INSERT INTO usuario SET ?", [usuario]);

      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: "agendajart@gmail.com",
          pass: "hrwp tjwr emfp hwqz",
        },
      });

      const mailOptions = {
        from: "agendajart@gmail.com",
        to: usuario.email,
        subject: "Bienvenido a la aplicación Agenda JART",
        html: `<H1>Hola ${usuario.nombre},</H1>
          <p>Tu usuario y contraseña para la aplicación de Agenda JART son:</p>
          <p><strong>Usuario:</strong> ${usuario.email}</p>
          <p><strong>Contraseña:</strong> ${usuario.password}</p>
          <p>Gracias por unirte a nosotros.</p>`,
      };

      transporter.sendMail(mailOptions, (error: any, info: any) => {
        if (error) {
          console.error("Error al enviar el correo electrónico:", error);
        } else {
          console.log("Correo electrónico enviado:", info.response);
        }
      });

      res
        .status(201)
        .json({
          message: "Se registró el usuario correctamente",
          insertedId: result.insertId,
        });
    } catch (error) {
      console.error("Error al registrar el usuario:", error);
      res.status(500).json({ message: "Error al registrar el usuario" });
    }
  }

  // Email de confirmación pa cambiar la contra
  public async enviarEmailConfirmacion(req: Request, res: Response): Promise<void> {
    function generateVerificationCode() {
      return Math.floor(100000 + Math.random() * 900000).toString();
    }

    try {
      const email = req.params.email;
      const codigo = generateVerificationCode();

      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: "agendajart@gmail.com",
          pass: "hrwp tjwr emfp hwqz",
        },
      });

      const mailOptions = {
        from: "agendajart@gmail.com",
        to: email,
        subject: "Código de verificación",
        html: `<H2>Hola, nos enteramos que estás intentando reestablecer tu contraseña.</H2>
          <p>El código de verificación que necesitas es el siguiente:</p>
          <h3>${codigo}</h3>
          <p><strong>Si no deseas realizar esta acción solo ignora este mensaje</strong></p>
          <p>¡Gracias por confiar en nosotros!</p>`,
      };

      transporter.sendMail(mailOptions, (error: any, info: any) => {
        if (error) {
          console.error("Error al enviar el correo electrónico:", error);
        } else {
          console.log("Correo electrónico enviado:", info.response);
        }
      });

      res
        .status(201)
        .json({
          message: "Se envió el correo correctamente",
          insertedId: codigo,
        });
    } catch (error) {
      console.error("Error al enviar el código:", error);
      res.status(500).json({ message: "Error al enviar el código" });
    }
  }

  // Cambio de contra
  public async cambiarContrasena(req: Request, res: Response): Promise<void> {
    try {
      const { id, email } = req.params;
      const usuario = req.body;
      await pool.query("UPDATE usuario SET ? WHERE id = ?", [
        req.body,
        id,
      ]);

      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: "agendajart@gmail.com",
          pass: "hrwp tjwr emfp hwqz",
        },
      });

      const mailOptions = {
        from: "agendajart@gmail.com",
        to: email,
        subject: "Contraseña cambiada en la aplicación Agenda JART",
        html: `<h1>Hola!</h1>
            <p>Tu contraseña ha sido cambiada correctamente. Ahora tus datos de inicio de sesión son:</p>
            <p><strong>Usuario:</strong> ${email}</p>
            <p><strong>Contraseña:</strong> ${usuario.password}</p>
            <p>Gracias por utilizar la aplicación Agenda JART.</p>`,
      };

      transporter.sendMail(mailOptions, (error: any, info: any) => {
        if (error) {
          console.error("Error al enviar el correo electrónico:", error);
        } else {
          console.log("Correo electrónico enviado:", info.response);
        }
      });

      res.json({ message: "La contraseña ha sido actualizada" });
    } catch (error) {
      console.error("Error al cambiar la contraseña:", error);
      res.status(500).json({ message: "Error al cambiar la contraseña" });
    }
  }

  // Update usuario
  public async modificarUsuario(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await pool.query("UPDATE usuario SET ? WHERE id = ?", [
        req.body,
        id,
      ]);
      res.json({ message: "El usuario ha sido actualizado" });
    } catch (error) {
      console.error("Error al modificar el usuario:", error);
      res.status(500).json({ message: "Error al modificar el usuario" });
    }
  }

  // Eliminar un usuario
  public async eliminarUsuario(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await pool.query("DELETE FROM usuario WHERE id = ?", [id]);
      res.json({ message: "El usuario ha sido eliminado" });
    } catch (error) {
      console.error("Error al eliminar el usuario:", error);
      res.status(500).json({ message: "Error al eliminar el usuario" });
    }
  }

  // Inicio de sesión sin OTP yasta chido
  public async inicio_sesion(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await pool.query(
        "SELECT u.id, CONCAT(u.nombre,' ',u.apePaterno,' ',u.apeMaterno) as nombre, r.id as idRol, r.nombre as nomRol,u.empresaFk as idEmpresa,e.nombre as nomEmpresa, u.areaFk as idArea, a.nombre as nomArea FROM usuario as u INNER JOIN rol as r ON r.id = u.rolFk LEFT JOIN empresa as e ON e.id = u.empresaFk LEFT JOIN area as a ON a.id = u.areaFk WHERE u.email = ? and u.password = ?",
        [email, password]
      );
  
      if (result.length > 0) {
        const user = result[0];
        const payload = {
          id: user.id,
          nombre: user.nombre,
          idRol: user.idRol,
          nomRol: user.nomRol,
          idEmpresa: user.idEmpresa,
          nomEmpresa: user.nomEmpresa,
          idArea: user.idArea,
          nomArea: user.nomArea
        };

        const token = jwt.sign(payload, 'oxIJjs8XYPjNk1hXsaeoybsVU9tx90byhpU6FSa90--6iWM45UlsDkFG5X9q4Rs3', { expiresIn: '24h' });
        res.status(200).json({ message: 'El usuario se ha logueado', token });
      } else {
        res.status(401).json({ message: 'Credenciales incorrectas' });
      }
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      res.status(500).json({ message: 'Error al iniciar sesión' });
    }
  }

  // Login con OTP ya esta chido
  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await pool.query(
        "SELECT u.id, CONCAT(u.nombre,' ',u.apePaterno,' ',u.apeMaterno) as nombre, r.id as idRol, r.nombre as nomRol,u.empresaFk as idEmpresa,e.nombre as nomEmpresa, u.areaFk as idArea, a.nombre as nomArea FROM usuario as u INNER JOIN rol as r ON r.id = u.rolFk LEFT JOIN empresa as e ON e.id = u.empresaFk LEFT JOIN area as a ON a.id = u.areaFk WHERE u.email = ? and u.password = ?",
        [email, password]
      );

      if (result.length > 0) {
        const user = result[0];
        const otp = this.generateOtp();
        const expires = Date.now() + 120000; // Tiempo de vida del OTP: 2 minutos
        this.otps[email] = { otp, expires };

        const payload = {
          id: user.id,
          nombre: user.nombre,
          idRol: user.idRol,
          nomRol: user.nomRol,
          idEmpresa: user.idEmpresa,
          nomEmpresa: user.nomEmpresa,
          idArea: user.idArea,
          nomArea: user.nomArea
        };

        const token = jwt.sign(payload, 'oxIJjs8XYPjNk1hXsaeoybsVU9tx90byhpU6FSa90--6iWM45UlsDkFG5X9q4Rs3', { expiresIn: '24h' });

        const transporter = nodemailer.createTransport({
          service: "Gmail",
          auth: {
            user: "agendajart@gmail.com",
            pass: "hrwp tjwr emfp hwqz",
          },
        });

        const mailOptions = {
          from: "agendajart@gmail.com",
          to: email,
          subject: "Tu código autenticación",
          html: `<H2>¡Hola!, un gusto vernos de nuevo.</H2>
          <p>Tu código de autenticación es:</p>
          <h3>${otp}</h3>
          <p><strong>Este código expira en dos minutos</strong></p>`,
        };

        transporter.sendMail(
          mailOptions,
          (error: any, info: { response: string }) => {
            if (error) {
              console.error("Error al enviar el correo electrónico:", error);
              res.status(500).json({ message: "Error al enviar el correo electrónico" });
            } else {
              console.log("Correo electrónico enviado: " + info.response);
              res.status(200).json({
                message: "OTP enviado a tu correo electrónico",
                token
              });
            }
          }
        );
      } else {
        res.status(401).json({ message: "Credenciales incorrectas" });
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      res.status(500).json({ message: "Error al iniciar sesión" });
    }
  }

  // Validación de teléfono y email
  public async validarTelefonoEmail(req: Request, res: Response): Promise<any> {
    try {
      const { email, telefono } = req.body;

      // Verificar si el correo ya está registrado
      const usuarioCorreo = await pool.query("SELECT * FROM usuario WHERE email = ?", [email]);
      if (usuarioCorreo.length > 0) {
          return res.status(400).json({ message: "El correo electrónico ya ha sido registrado" });
      }

      // Verificar si el teléfono ya está registrado
      const usuarioTelefono = await pool.query("SELECT * FROM usuario WHERE telefono = ?", [telefono]);
      if (usuarioTelefono.length > 0) {
          return res.status(400).json({ message: "El teléfono ya ha sido registrado" });
      }

      // Si el correo y el teléfono no están registrados, retornar éxito
      res.status(200).json({ message: "El correo y el teléfono están disponibles para registro" });

    } catch (error) {
        console.error("Error al validar el correo y el teléfono:", error);
        res.status(500).json({ message: "Error al validar el correo y el teléfono" });
    }
  }

  // Genera el OTP, ta chido
  public generateOtp(): string {
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp.toString();
  }

  // Verificar el OTP ta chido
  public verifyOtp(req: Request, res: Response): void {
    const { email, otp } = req.body;
    if (
      this.otps[email] &&
      this.otps[email].otp === otp &&
      this.otps[email].expires > Date.now()
    ) {
      res.status(200).json({ message: "OTP verificado correctamente" });
      delete this.otps[email]; // Eliminar OTP después de ser usado
    } else {
      res.status(400).json({ message: "OTP incorrecto o expirado" });
    }
  }

}

export const usuarioController = new UsuarioController();
export default usuarioController;
