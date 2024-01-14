import React, { Fragment } from 'react';

import type { TVulnerability } from '@/sdk/src/types';

import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import defiBuilderLogo from '@/assets/images/defi-builder-logo.png';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    color: '#333'
  },
  frontPage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',

    logo: {
      width: '400px',
      marginBottom: '10px'
    },

    title: {
      fontWeight: 800,
      fontSize: '35px',
      color: '#f0f0f0'
    }
  },
  section: {
    marginVertical: 10,
    marginHorizontal: 10,

    title: {
      fontSize: '30px'
    },

    subtitle: {
      fontSize: '25px'
    }
  }
});

interface IAuditPdf {
  audit: TVulnerability[];
  title?: string;
  author?: string;
}

export default function AuditPdf({
  audit,
  title = 'DeFi Builder - Smart contract audit',
  author = 'DeFi Builder'
}: IAuditPdf) {
  return (
    <Document title={title} author={author}>
      <Page size='A4' style={styles.page}>
        <View style={styles.frontPage}>
          <Image src={defiBuilderLogo} style={styles.frontPage.logo} />
          <Text style={styles.frontPage.title}>Smart contract audit</Text>
        </View>
      </Page>
      <Page
        size='A4'
        // Workaround to add padding on pages w/ text that extends on multiple pages
        style={{ ...styles.page, paddingVertical: 20, paddingHorizontal: 10 }}
      >
        <View style={styles.section}>
          <Text style={styles.section.title}>Smart contract audit</Text>
          {audit.map((audit, index) => (
            <Fragment key={`${audit.severity}-${index}`}>
              <Text style={styles.section.subtitle}>{audit.severity}</Text>
              <Text>{audit.description}</Text>
            </Fragment>
          ))}
        </View>
      </Page>
    </Document>
  );
}
