import { Body, Column, Font, Head, Html, Img, Link, Section, Text } from "@react-email/components";
import * as React from "react";

/** @jsxImportSource react */
import { MAIL_ASSETS_URL, MAIL_FROM_NAME, SITE_URL } from "@/constants";

import { styles, vars } from "./styles";

export { vars };

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <Html>
      <Head>
        <Font fontFamily="Arial" fallbackFontFamily="sans-serif" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{`Message from ${MAIL_FROM_NAME}`}</title>
      </Head>
      <Body style={{ backgroundColor: vars.colors.background, padding: "20px 0" }}>
        <Section style={{ maxWidth: "456px", margin: "0 auto" }}>
          <Column
            style={{
              backgroundColor: vars.colors.container,
              borderRadius: vars.borderRadius,
              padding: "0",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              overflow: "hidden"
            }}
          >
            <div style={{ padding: vars.spacing.large }}>
              <Img
                src={`${MAIL_ASSETS_URL}/assets/mail/banner.png`}
                alt={MAIL_FROM_NAME}
                style={styles.image}
              />
            </div>
            <div
              style={{
                padding: `0 ${vars.spacing.large} ${vars.spacing.large} ${vars.spacing.large}`
              }}
            >
              {children}
            </div>
            <div style={{ padding: `0 ${vars.spacing.large}` }}>
              <Text style={styles.footer}>
                Best Regards <br />
                {`${MAIL_FROM_NAME} Team`}
              </Text>

              <Img src={`${MAIL_ASSETS_URL}/assets/mail/footer.png`} alt="" style={styles.image} />

              <div
                style={{
                  textAlign: "center",
                  padding: `16px ${vars.spacing.large} ${vars.spacing.large} ${vars.spacing.large}`
                }}
              >
                <Link href={`${SITE_URL}/legal/terms`} style={styles.footerLink}>
                  Terms Of Service
                </Link>
                <span style={styles.divider}></span>
                <Link href={`${SITE_URL}/contact`} style={styles.footerLink}>
                  Contact Us
                </Link>
              </div>

              <div
                style={{
                  textAlign: "center",
                  padding: `${vars.spacing.medium} ${vars.spacing.large} ${vars.spacing.large} ${vars.spacing.large}`
                }}
              >
                <Link href={`${SITE_URL}`} style={styles.brandLink}>
                  {MAIL_FROM_NAME}
                </Link>
              </div>
            </div>
          </Column>
        </Section>
      </Body>
    </Html>
  );
}
