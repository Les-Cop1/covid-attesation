const QRCode = require('qrcode')
const PDFLib = require('pdf-lib');
const rgb = PDFLib.rgb;
const PDFDocument = PDFLib.PDFDocument;
const StandardFonts = PDFLib.StandardFonts;
let fs = require('fs')

const ys = {
    travail: 540,
    sante: 508,
    famille: 474,
    handicap: 441,
    convocation: 418,
    missions: 397,
    transits: 363,
    animaux: 330,
}

function addZero(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}

function generateQR(text) {
    const opts = {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
    }
    return QRCode.toDataURL(text, opts)
}

async function generatePdf(profile, reason, pdfBase) {
    // Date de création du fichier x minutes avant la date de sortie
    const minutesBefore = 5

    const {
        lastname,
        firstname,
        birthday,
        placeofbirth,
        address,
        zipcode,
        city,
        datesortie,
        heuresortie,
    } = profile

    const dateSortieFormated = `${datesortie.substr(6,4)}-${datesortie.substr(3,2)}-${datesortie.substr(0,2)}`
    let date = new Date(`${dateSortieFormated} ${heuresortie}`)

    date.setMinutes(date.getMinutes() - minutesBefore)

    const creationDay = addZero(date.getDate()).toString()
    const creationMonth = addZero(date.getMonth() + 1).toString()
    const creationYear = date.getFullYear().toString()

    const creationDate = `${creationDay}/${creationMonth}/${creationYear}`
    const creationDateTitre = `${creationYear}-${creationMonth}-${creationDay}`
    const creationHour = addZero(date.getHours()) + "h" + addZero(date.getMinutes())
    const creationHourTitre = addZero(date.getHours()) + "-" + addZero(date.getMinutes())

    const data = [
        `Cree le: ${creationDate} a ${creationHour}`,
        `Nom: ${lastname}`,
        `Prenom: ${firstname}`,
        `Naissance: ${birthday} a ${placeofbirth}`,
        `Adresse: ${address} ${zipcode} ${city}`,
        `Sortie: ${datesortie} a ${heuresortie}`,
        `Motifs: ${reason}`,
    ].join(';\n ')

    const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfBase))
    let title = 'attestation-' + creationDateTitre + "_" + creationHourTitre
    pdfDoc.setTitle(title)
    pdfDoc.setSubject('Attestation de déplacement dérogatoire')
    pdfDoc.setKeywords([
        'covid19',
        'covid-19',
        'attestation',
        'déclaration',
        'déplacement',
        'officielle',
        'gouvernement',
    ])
    pdfDoc.setProducer('DNUM/SDIT')
    pdfDoc.setCreator('Lucas & Félix')
    pdfDoc.setAuthor("Ministère de l'intérieur")

    const page1 = pdfDoc.getPages()[0]

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const drawText = (text, x, y, size = 11) => {
        page1.drawText(text, {x, y, size, font})
    }

    drawText(`${firstname} ${lastname}`, 119, 665)
    drawText(birthday, 119, 645)
    drawText(placeofbirth, 312, 645)
    drawText(`${address} ${zipcode} ${city}`, 133, 625)

    drawText('x', 73, ys[reason], 12)

    let locationSize = getIdealFontSize(font, profile.city, 83, 7, 11)

    if (!locationSize) {
        locationSize = 7
    }

    drawText(profile.city, 105, 286, locationSize)
    drawText(`${profile.datesortie}`, 91, 267, 11)
    drawText(`${profile.heuresortie}`, 312, 267, 11)

    const qrTitle1 = 'QR-code contenant les informations '
    const qrTitle2 = 'de votre attestation numérique'

    const generatedQR = await generateQR(data)

    const qrImage = await pdfDoc.embedPng(generatedQR)

    page1.drawText(qrTitle1 + '\n' + qrTitle2, {x: 440, y: 230, size: 6, font, lineHeight: 10, color: rgb(1, 1, 1)})


    page1.drawImage(qrImage, {
        x: page1.getWidth() - 156,
        y: 125,
        width: 92,
        height: 92,
    })

    pdfDoc.addPage()
    const page2 = pdfDoc.getPages()[1]
    page2.drawText(qrTitle1 + qrTitle2, {x: 50, y: page2.getHeight() - 40, size: 11, font, color: rgb(1, 1, 1)})
    page2.drawImage(qrImage, {
        x: 50,
        y: page2.getHeight() - 350,
        width: 300,
        height: 300,
    })

    return {"file": await pdfDoc.save(), title};

}


function getIdealFontSize(font, text, maxWidth, minSize, defaultSize) {
    let currentSize = defaultSize
    let textWidth = font.widthOfTextAtSize(text, defaultSize)

    while (textWidth > maxWidth && currentSize > minSize) {
        textWidth = font.widthOfTextAtSize(text, --currentSize)
    }

    return textWidth > maxWidth ? null : currentSize
}

module.exports = {generatePdf}
