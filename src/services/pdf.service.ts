import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { AttendanceRecord } from './attendance.service'

interface PDFExportOptions {
  teacherName?: string
  courseName?: string
  date: string
  records: AttendanceRecord[]
}

class PDFService {
  generateAttendancePDF(options: PDFExportOptions): void {
    console.log('PDFService.generateAttendancePDF called', {
      teacherName: options.teacherName,
      courseName: options.courseName,
      date: options.date,
      recordsCount: options.records?.length ?? 0
    })

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    // En-tête
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Université Catholique de Bukavu', pageWidth / 2, 20, { align: 'center' })

    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text('Feuille de Présence', pageWidth / 2, 30, { align: 'center' })

    // Info session
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Date: ${this.formatDate(options.date)}`, 14, 45)

    // fallback teacher name
    const teacherLabel = options.teacherName && options.teacherName.trim().length > 0
      ? options.teacherName
      : '—' // affiche un tiret si absent
    doc.text(`Professeur: ${teacherLabel}`, 14, 52)

    if (options.courseName) {
      doc.text(`Cours: ${options.courseName}`, 14, 59)
    }

    // Normalize/Robust mapping des champs des enregistrements
    const tableData = (options.records || []).map((record, index) => {
      // différents schémas possibles : student_name, nom, firstname/lastname, student?.name, etc.
      const studentName =
        (record as any).student_name ||
        (record as any).nom ||
        ((record as any).student && ((record as any).student.name || `${(record as any).student.first_name || ''} ${(record as any).student.last_name || ''}`)) ||
        ((record as any).first_name || '') + ((record as any).last_name ? ` ${(record as any).last_name}` : '') ||
        'Nom inconnu'

      const matricule =
        (record as any).student_matricule ||
        (record as any).matricule ||
        (record as any).student?.matricule ||
        ''

      // possible date fields
      const dateField =
        (record as any).date_heure ||
        (record as any).date ||
        (record as any).created_at ||
        (record as any).attended_at ||
        ''

      return [
        (index + 1).toString(),
        matricule,
        studentName,
        this.safeFormatDateTime(dateField),
        ''
      ]
    })

    autoTable(doc, {
      startY: options.courseName ? 65 : 60,
      head: [['N°', 'Matricule', 'Nom Complet', 'Heure d\'arrivée', 'Signature']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 4
      },
      headStyles: {
        fillColor: [0, 51, 102],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 35 },
        2: { cellWidth: 60 },
        3: { cellWidth: 40 },
        4: { cellWidth: 40 }
      },
      didDrawPage: (data) => {
        // on peut rajouter pied de page si besoin (non intrusif)
      }
    })

    // lastAutoTable peut ne pas exister, on protège
    const lastAuto = (doc as any).lastAutoTable
    const finalY = lastAuto && lastAuto.finalY ? lastAuto.finalY : 100

    doc.setFontSize(9)
    doc.text(`Total des présences: ${tableData.length}`, 14, finalY + 10)

    doc.text('Signature du professeur:', 14, finalY + 25)
    doc.text('_________________________', 14, finalY + 35)

    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(`Document généré le ${this.formatDateTime(new Date().toISOString())}`, 14, doc.internal.pageSize.getHeight() - 10)

    const safeCourseName = options.courseName ? options.courseName.replace(/\s+/g, '_') : 'cours'
    const filename = `Presences_${safeCourseName}_${options.date}.pdf`

    console.log('Saving PDF, filename:', filename)
    doc.save(filename)
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '—'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString // renvoyer l'original si invalide
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  private formatDateTime(dateString: string): string {
    if (!dateString) return '—'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // méthode non-throwing utilisée pour chaque ligne
  private safeFormatDateTime(dateString: any): string {
    try {
      return this.formatDateTime(String(dateString || ''))
    } catch {
      return ''
    }
  }
}

export default new PDFService()
