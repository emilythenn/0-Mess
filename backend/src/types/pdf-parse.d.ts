declare module 'pdf-parse' {
  interface PDFInfo {
    PDFFormatVersion: string;
    IsAcroFormPresent: boolean;
    IsXFAPresent: boolean;
    Creator: string;
    Producer: string;
    CreationDate: string;
    ModDate: string;
    Format: string;
    Encryption: string;
    Linearized: string;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: any;
    text: string;
    version: string;
  }

  type PDFOptions = {
    pagerender?: (pageData: any) => string;
    max?: number;
    version?: string;
  };

  function pdf(dataBuffer: Buffer, options?: PDFOptions): Promise<PDFData>;

  export default pdf;
}
