PDS_VERSION_ID          = PDS3
RECORD_TYPE             = STREAM
OBJECT                  = TEXT
  PUBLICATION_DATE      = 2012-05-09
  NOTE                  = "N/A"
END_OBJECT              = TEXT

END

                              AAREADME.TXT
                               May 9, 2012

==============================================================================
INTRODUCTION
==============================================================================

This archive contains Reduced Data Record (RDR) instrument 
data acquired by the Dynamic Albedo of Neutrons (DAN) instrument on the 
Mars Science Laboratory rover.

==============================================================================
VOLUME SET INFORMATION
==============================================================================

DAN RDR data are stored in an archive volume having the directory structure 
illustrated below.  Raw DAN data products (EDRs) are stored in a separate
archive volume not described here.

   root
    |
    |- AAREADME.TXT            Introduction to the archive (this file)
    |- ERRATA.TXT              Release notes and errata for the archive
    |- VOLDESC.CAT             Description of the contents of the archive 
    |
    |- CALIBRATION
    |     |
    |     |- CALINFO.TXT       Description of the CALIBRATION directory
    |     |- DAN_CALIBRATION_REPORT.HTM - DAN calibration report in HTML
    |     |- DAN_CALIBRATION_REPORT.PDF - DAN calibration report in PDF
    |     |- DAN_CALIBRATION_REPORT.LBL - PDS label describing the above files
    |
    |- CATALOG
    |     |
    |     |- CATINFO.TXT       Description of the CATALOG directory
    |     |- DAN_INST.CAT      Instrument description
    |     |- DAN_PERSON.CAT    Relevant DAN personnel
    |     |- DAN_RDR_DS.CAT    Dataset description
    |     |- DAN_REF.CAT       References mentioned in DAN*.CAT files
    |     |- MSL_INSTHOST.CAT  Instrument host (rover) description 
    |     |- MSL_MISSION.CAT   Mission description
    |     |- MSL_REF.CAT       References mentioned in MSL*.CAT files
    |
    |- DATA
    |     |
    |     |- SOLnnnn           Directory of data acquired on sol nnnn
    |          |
    |          |- DN*.DAT      DAN data products
    |          |- DN*.LBL      PDS labels describing each data product
    |
    |- DOCUMENT
    |     |
    |     |- DOCINFO.TXT       Description of the DOCUMENT directory
    |     |- DAN_RDR_ARCHIVE_SIS.HTM  RDR Archive SIS in HTML format
    |     |- DAN_RDR_ARCHIVE_SIS_PDF  RDR Archive SIS in PDF format
    |     |- DAN_RDR_ARCHIVE_SIS.LBL  PDS label for the PDF and HTML files
    |     |- DAN_RDR_SIS.HTM   DAN RDR data product specification in HTML
    |     |- DAN_RDR_SIS.PDF   DAN RDR data product specification in PDF
    |     |- DAN_RDR_SIS.LBL   PDS label for the HTML and PDF files
    |     |- PDSDD.FUL         PDS Data Dictionary
    |     |- PDSDD.LBL         PDS label for PDSDD.FUL
    |
    |- INDEX
    |     |
    |     |- INDXINFO.TXT      Description of the INDEX directory
    |     |- INDEX.TAB         Table of data products in the DAN RDR archive
    |     |- INDEX.LBL         PDS label describing INDEX.TAB
    |
    |- LABEL
          |
          |- LABINFO.TXT                Description of LABEL directory
          |- DAN_RDR_AVERAGE_ACTIV.FMT  Column definitions, AA RDR
          |- DAN_RDR_AVERAGE_PASSIV.FMT Column definitions, AP RDR
          |- DAN_RDR_DERIVED_ACTIV.FMT  Column definitions, DA RDR
          |- DAN_RDR_DERIVED_ENG.FMT    Column definitions, DE RDR
          |- DAN_RDR_DERIVED_PASSIV.FMT Column definitions, DP RDR
    

==============================================================================
FILE FORMAT
==============================================================================

DAN RDR data files are stored as binary tables with file names ending in DAT.
Each one is accompanied by a detached PDS label with the same name but the 
extension LBL, which describes the format and content of the binary table.
PDS labels are text files.

The label file may include a pointer to a format file, with a name ending 
in FMT. (For example, such a pointer might be ^STRUCTURE = 
"DAN_RDR_AVERAGE_ACTIV.FMT".) Format files are fragments of labels that 
are intended to be read by software as if they were inserted into the label 
where the pointer statement is located. They describe details of the binary
table's column structure. Format files are located in the LABEL directory. In
this way long column definitions are stored in only one place and do not have
to be repeated in every data product's label.

Detailed documentation on data file contents is available in the DAN RDR 
Software Interface Specification (DAN_RDR_SIS.PDF) in the DOCUMENT directory.

All text files in the archive, including PDS labels, are delimited with 
carriage-return (ASCII 13) line-feed (ASCII 10) pairs at the end of the line.

Where a document appears as a PDF file (Portable Document Format), it will
be accompanied by an HTML version of the same document to ensure that the
document can be read even if no PDF software is available. A detached PDS
label describes both the PDF and HTML files. Any images present in the 
HTML document will found in the subdirectory <DOCUMENT>_FILES.

==============================================================================
COGNIZANT PERSONNEL
==============================================================================

DAN RDR data products are generated and assembled into archive volumes by the 
MSL DAN Science Team, and delivered to Planetary Data System Geosciences Node.
The Geosciences Node releases the archives to the public according to the 
MSL Project release schedule.

DAN Science Team Archive Representative: Karl Harshman, University of Arizona,
karl@lpl.arizona.edu. 

PDS Geosciences Node Representative: Susan Slavney, Washington University,
Susan.Slavney@wustl.edu. 
