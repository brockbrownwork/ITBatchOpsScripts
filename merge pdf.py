from PyPDF2 import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from io import BytesIO

def add_header_to_pdf(pdf_reader, text):
    packet = BytesIO()
    can = canvas.Canvas(packet, pagesize=letter)
    can.setFont("Helvetica", 12)
    can.drawString(80, 770, text)  # Offset slightly to the left and down from the top
    can.save()

    packet.seek(0)
    overlay_pdf = PdfReader(packet)
    writer = PdfWriter()

    for page_num in range(len(pdf_reader.pages)):
        page = pdf_reader.pages[page_num]
        overlay_page = overlay_pdf.pages[0]

        page.merge_page(overlay_page)
        writer.add_page(page)

    return writer

def merge_pdfs_with_headers(pdf_files):
    writer = PdfWriter()

    for pdf_file in pdf_files:
        reader = PdfReader(pdf_file)
        header_pdf_writer = add_header_to_pdf(reader, pdf_file)

        for page_num in range(len(header_pdf_writer.pages)):
            writer.add_page(header_pdf_writer.pages[page_num])

    with open("merged_with_headers.pdf", "wb") as output_pdf:
        writer.write(output_pdf)

# List your PDFs in the order you want them merged
pdf_files = ["sample-local-pdf.pdf", "Lorem_ipsum.pdf"]  # Replace with your actual file names

merge_pdfs_with_headers(pdf_files)
