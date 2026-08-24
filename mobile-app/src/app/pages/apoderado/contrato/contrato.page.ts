import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonIcon,
  IonSpinner,
  IonModal,
  IonButton,
  IonButtons,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  menuOutline,
  documentTextOutline,
  informationCircleOutline,
  documentOutline,
  calendarOutline,
  personOutline,
  shieldCheckmarkOutline,
  peopleOutline,
  schoolOutline,
  readerOutline,
  eyeOutline,
  downloadOutline,
  closeOutline
} from 'ionicons/icons';
import { jsPDF } from 'jspdf';

import { AuthService, Usuario } from '../../../services/auth.service';
import { EstudianteService, Estudiante } from '../../../services/estudiante.service';

@Component({
  selector: 'app-contrato',
  templateUrl: './contrato.page.html',
  styleUrls: ['./contrato.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonIcon,
    IonSpinner,
    IonModal,
    IonButton,
    IonButtons
  ]
})
export class ContratoPage implements OnInit {
  usuario: Usuario | null = null;
  estudiantes: Estudiante[] = [];
  cargando = true;

  numeroContrato = 'CTR-2026-0001';
  fechaFirma = '23 de Agosto, 2026';
  titularNombre = '';
  rutTitular = '';
  showModalVerContrato = false;

  constructor(
    private authService: AuthService,
    private estudianteService: EstudianteService,
    private toastController: ToastController
  ) {
    addIcons({
      arrowBackOutline,
      menuOutline,
      documentTextOutline,
      informationCircleOutline,
      documentOutline,
      calendarOutline,
      personOutline,
      shieldCheckmarkOutline,
      peopleOutline,
      schoolOutline,
      readerOutline,
      eyeOutline,
      downloadOutline,
      closeOutline
    });
  }

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;
    this.usuario = this.authService.getUsuario();

    if (this.usuario) {
      const nombreCompleto = `${this.usuario.first_name || ''} ${this.usuario.last_name || ''}`.trim();
      this.titularNombre = nombreCompleto || this.usuario.email;
      this.rutTitular = this.usuario.rut || '12.345.678-9';
      const numId = this.usuario.id ? String(this.usuario.id).padStart(4, '0') : '0001';
      this.numeroContrato = `CTR-2026-${numId}`;
    } else {
      this.titularNombre = 'Apoderado Registrado';
      this.rutTitular = 'Sin RUT registrado';
    }

    this.estudianteService.obtenerEstudiantes().subscribe({
      next: (res) => {
        this.estudiantes = res || [];
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar estudiantes del contrato:', err);
        this.cargando = false;
      }
    });
  }

  verContrato() {
    this.showModalVerContrato = true;
  }

  cerrarModalContrato() {
    this.showModalVerContrato = false;
  }

  async descargarPDF() {
    try {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const primaryTeal = [15, 118, 110]; // #0f766e
      const darkText = [23, 51, 48];     // #173330
      const mutedText = [107, 124, 121]; // #6b7c79

      // Header Banner
      doc.setFillColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
      doc.rect(0, 0, 210, 32, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('RUTAS SEGURAS', 14, 14);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Sistema de Transporte Escolar Seguro', 14, 22);
      doc.text('DOCUMENTO OFICIAL DE CONTRATO', 135, 22);

      // Title
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('CONTRATO DE PRESTACIÓN DE SERVICIOS DE TRANSPORTE ESCOLAR', 14, 44);

      // Divider Line
      doc.setDrawColor(200, 220, 218);
      doc.setLineWidth(0.5);
      doc.line(14, 48, 196, 48);

      // Resumen del Contrato
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
      doc.text('1. DATOS DEL CONTRATO', 14, 56);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text(`Número de Contrato: ${this.numeroContrato}`, 14, 63);
      doc.text(`Fecha de Emisión / Firma: ${this.fechaFirma}`, 14, 69);
      doc.text(`Estado del Contrato: VIGENTE`, 14, 75);

      // Datos del Apoderado
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
      doc.text('2. DATOS DEL TITULAR (APODERADO)', 14, 87);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text(`Nombre Completo: ${this.titularNombre}`, 14, 94);
      doc.text(`RUT: ${this.rutTitular}`, 14, 100);
      doc.text(`Correo Electrónico: ${this.usuario?.email || 'N/A'}`, 14, 106);
      doc.text(`Teléfono Contacto: ${this.usuario?.telefono || 'N/A'}`, 14, 112);

      // Estudiantes Beneficiarios
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
      doc.text('3. ESTUDIANTES BENEFICIARIOS REGISTRADOS', 14, 124);

      let currentY = 132;
      if (this.estudiantes.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
        doc.text('No hay estudiantes vinculados a este contrato actualmente.', 14, currentY);
        currentY += 10;
      } else {
        doc.setFillColor(232, 245, 243);
        doc.rect(14, currentY - 5, 182, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(darkText[0], darkText[1], darkText[2]);
        doc.text('Estudiante', 16, currentY);
        doc.text('RUT', 75, currentY);
        doc.text('Colegio / Curso', 115, currentY);
        currentY += 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        this.estudiantes.forEach((est) => {
          const nombreEst = `${est.nombre} ${est.apellido}`;
          const colCurso = `${est.colegio || ''} (${est.curso || ''})`;
          doc.text(nombreEst, 16, currentY);
          doc.text(est.rut || '', 75, currentY);
          doc.text(colCurso, 115, currentY);
          currentY += 7;
        });
        currentY += 4;
      }

      // Cláusulas del Servicio
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryTeal[0], primaryTeal[1], primaryTeal[2]);
      doc.text('4. CLÁUSULAS Y TÉRMINOS DEL SERVICIO', 14, currentY + 4);
      currentY += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);

      const clausulas = [
        '• Rutas Seguras se compromete a prestar el servicio de transporte escolar autorizado con conductores calificados y vehículos certificados.',
        '• El apoderado garantiza la veracidad de los datos de contacto y direcciones entregadas para los estudiantes beneficiarios.',
        '• El servicio incluye la notificación de estados de la ruta (subida, bajada y seguimiento en tiempo real) a través de la aplicación.',
        '• El contrato mantendrá su vigencia durante el año escolar activo o hasta su cancelación express formalizada en la plataforma.'
      ];

      clausulas.forEach((clause) => {
        const lines = doc.splitTextToSize(clause, 180);
        doc.text(lines, 14, currentY);
        currentY += lines.length * 4.5 + 2;
      });

      // Signature section
      currentY = Math.max(currentY + 12, 240);
      doc.setDrawColor(200, 220, 218);
      doc.line(14, currentY, 90, currentY);
      doc.line(110, currentY, 186, currentY);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(this.titularNombre, 14, currentY + 5);
      doc.text('Rutas Seguras SpA', 110, currentY + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(mutedText[0], mutedText[1], mutedText[2]);
      doc.text(`Firma Digital Apoderado (${this.rutTitular})`, 14, currentY + 10);
      doc.text('Firma Electrónica Autorizada', 110, currentY + 10);

      // Save PDF
      const filename = `Contrato_Rutas_Seguras_${this.rutTitular.replace(/[^a-zA-Z0-9]/g, '')}.pdf`;
      doc.save(filename);

      const toast = await this.toastController.create({
        message: 'Contrato descargado exitosamente en formato PDF.',
        duration: 3000,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();
    } catch (err) {
      console.error('Error al generar PDF del contrato:', err);
      const toast = await this.toastController.create({
        message: 'Ocurrió un error al generar el PDF del contrato.',
        duration: 3000,
        color: 'danger',
        position: 'bottom'
      });
      await toast.present();
    }
  }
}