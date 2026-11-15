PDS_VERSION_ID         = PDS3 

RECORD_TYPE            = STREAM
INSTRUMENT_HOST_NAME   = "LUNAR RECONNAISSANCE ORBITER"
INSTRUMENT_NAME        = "LUNAR EXPLORATION NEUTRON DETECTOR"
TARGET_NAME            = MOON
OBJECT                 = TEXT
  PUBLICATION_DATE     = 2016-06-02
  NOTE                 = "Introduction to LRO LEND EDR/RDR Data" 
END_OBJECT             = TEXT
END 
                                                
    2008 LUNAR RECONNAISSANCE ORBITER LUNER EXPERIMENT NEUTRON DETECTOR
    EXPERIMENT AND REDUCED DATA RECORDS

Introduction
------------

The Lunar Experiment Neutron Detector (LEND) Experiment Data Records (EDRs)
and Reduced Data Records (RDRs) are raw, uncalibrated, calibrated and 
ancillary data acquired by the LEND Subsystem.

Information about the EDR and RDR products can be found in the LEND EDR 
and RDR Software Interface Specifications (SISs) in the DOCUMENT directory 
of this archive. Information about the structure and contents of the archive 
can be found in the Archive Volume SIS in the DOCUMENT directory.

File Formats
------------

The LEND EDR/RDR data product contains eight types of data files:
  EDR SCI             Raw Neutron spectra data
  EDR HK              Raw Housekeeping data
  RDR CHK             Calibrated Housekeeping data
  RDR RSCI            Raw Neutron spectra with spatial data
  RDR DLD             Derived Neutron spectra data
  RDR DLX             Extended Derived Neutron spectra data
  RDR ALD             Averaged Neutron spectra data
  RDR ALF             Averaged Neutron flux data
  
All products are binary time series files.

The file naming convention for LEND EDR/RDR data files is the PRODUCT_TYPE 
value followed by an eight-digit date specifier in the format YYYYMMDD, 
e.g. LEND_EDR_SCI_20081223.DAT, LEND_RDR_RSCI_20081223.DAT. 

Each data file is described by a PDS label in a separate file with the
same name, extension ".LBL", in the same directory as the data file.
The labels contain identification and observation parameters
associated with the data files and definitions for the TIME_SERIES
objects.  In most cases, the PDS label includes a pointer to a format
file that contains column definitions (extension ".FMT"). These format
files are found in the LABEL directory.

Volume Contents
---------------

The LEND EDR/RDR archive volume includes the following files and directories.

Root directory
  AAREADME.TXT - the file you are reading
  ERRATA.TXT   - notes and errata
  VOLDESC.CAT  - volume description for the PDS catalog

CALIBRATION directory
  LEND_CALIBRATION_REPORT.PDF - Preliminary LEND calibration report in PDF 
    format
  LEND_CALIBRATION_REPORT.HTM - Preliminary LEND calibration report in HTM
    format
  LEND_CALIBRATION_REPORT.LBL - PDS label for LEND_CALIBRATION_REPORT.PDF 
    and LEND_CALIBRATION_REPORT.HTM

CALIBRATION\LEND_CALIBRATION_REPORT_FILES directory
  Supporting files for LEND_CALIBRATION_REPORT.HTM

CATALOG directory
  CATINFO.TXT  - description of contents of this directory
  *.CAT        - descriptions of dataset, instrument, spacecraft,
                 mission, and personnel for the PDS catalog

DOCUMENT directory
  DOCINFO.TXT              - description of contents of this directory
  LEND_ARCHIVE_VOL_SIS.HTM - LEND Archive Volume SIS in HTML format
  LEND_ARCHIVE_VOL_SIS.PDF - LEND Archive Volume SIS in PDF format
  LEND_ARCHIVE_VOL_SIS.LBL - PDS label for LEND_ARCHIVE_VOL_SIS.PDF and 
                             LEND_ARCHIVE_VOL_SIS.HTM
  LEND_EDR_SIS.HTM         - LEND EDR SIS in HTML format
  LEND_EDR_SIS.PDF         - LEND EDR SIS in PDF format
  LEND_EDR_SIS.LBL         - PDS label for LEND_EDR_SIS.PDF and 
                             LEND_EDR_SIS.HTM
  LEND_DATA_PROCESSING.HTM - Processing steps from raw to derived products
  LEND_DATA_PROCESSING.PDF - Processing document in PDF format
  LEND_DATA_PROCESSING.LBL - PDS label for processing document in PDF and
                             HTM format
  LEND_RDR_SIS.HTM         - LEND RDR SIS in HTML format
  LEND_RDR_SIS.PDF         - LEND RDR SIS in PDF format
  LEND_RDR_SIS.LBL         - PDS label for LEND_RDR_SIS.PDF and 
                             LEND_RDR_SIS.HTM
  REFERENCES.TXT           - a compilation of published LEND papers and 
                             conference abstracts
  PDSDD.FUL                - complete PDS Data Dictionary including LRO 
                             local keywords
  PDSDD.IDX                - index for PDSDD.FUL
  PDSDD.LBL                - PDS label for PDSDD.FUL and PDSDD.IDX

DOCUMENT\LEND_EDR_SIS_FILES directory
  Supporting files for LEND_EDR_SIS.HTM

DOCUMENT\LEND_RDR_SIS_FILES directory
  Supporting files for LEND_RDR_SIS.HTM

SOFTWARE directory
  SOFTINFO.TXT  - description of contents of this directory

INDEX directory
  INDXINFO.TXT - description of contents of this directory
  INDEX.TAB    - index of all products in the archive
  INDEX.LBL    - PDS label that describes INDEX.TAB

LABEL directory
  LABINFO.TXT  - description of contents of this directory
  *.FMT        - format files referenced in PDS labels

Data directories
  Data files are are aggregated by flight day; i.e., one product contains 
  one day's worth of data. Flight day is defined to be midnight to midnight 
  UTC. Data for each flight day will be in a subdirectory named in the 
  format YYYYMMDD, indicating the date at the end of the data acquisition 
  period. Within each subdirectory will be eight PDS labels and associated
  data files for the eight product types listed in the 'File Formats' 
  section above.

  The schematic below shows an example of the nesting of directories for 
  data acquired beginning at midnight March 18, 2009 through March 19, 2009. 

  <Volume Root>
  -------------------
  |
  -DATA
  |- 2009
  | |
  | |-- 20090319
  | | |
  | | | -- <LEND_SCI_DATA files acquired March 18-19, 2009>
  | | |
  | | | -- <LEND_HK_DATA files acquired March 18-19, 2009>
  | | |
  | | | -- <LEND_CONVERTED_HK_DATA files acquired March 18-19, 2009>
  | | |
  | | | -- <LEND_RECTIFIED_SCIENCE_DATA files acquired March 18-19, 2009> 
  | | |
  | | | -- <DERIVED_LEND_DATA files acquired March 18-19, 2009>
  | | |
  | | | -- <EXTENDED_DERIVED_LEND_DATA files acquired March 18-19, 2009>
  | | |
  | | | -- <AVERAGED_LEND_DATA files acquired March 18-19, 2009>
  | | |
  | | | -- <AVERAGED_NEUTRON_FLUX_DATA files acquired March 18-19, 2009>
  | | |
  
Contacts
--------

For questions concerning these data products and documentation, contact:

          PDS Geosciences Node
          Washington University
          Dept. of Earth and Planetary Sciences
          1 Brookings Drive
          St. Louis, MO 63130
          314-935-5493

          WWW Site:  http://pds-geosciences.wustl.edu
          Electronic mail address:  geosci@wunder.wustl.edu
