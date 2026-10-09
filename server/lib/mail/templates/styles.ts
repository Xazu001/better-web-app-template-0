export const vars = {
  borderRadius: "32px",
  spacing: {
    small: "12px",
    medium: "16px",
    large: "24px"
  },
  colors: {
    background: "#f5f5f5",
    container: "#ffffff",
    text: "#333333",
    textMuted: "#666666",
    primary: "#90db1e",
    border: "#cccccc"
  },
  fonts: {
    primary: "Arial, sans-serif"
  }
};

export const styles = {
  title: {
    fontFamily: vars.fonts.primary,
    fontSize: "24px",
    lineHeight: "150%",
    margin: "0 0 20px 0",
    color: vars.colors.text
  },

  body: {
    fontFamily: vars.fonts.primary,
    fontSize: "16px",
    lineHeight: "1.5",
    margin: "0 0 20px 0",
    color: vars.colors.text
  },

  footer: {
    color: vars.colors.textMuted,
    fontSize: "14px",
    textAlign: "center",
    margin: "0 0 24px 0"
  },

  footerLink: {
    color: vars.colors.textMuted,
    textDecoration: "none",
    fontSize: "14px",
    margin: "0 10px"
  },

  brandLink: {
    color: vars.colors.primary,
    fontWeight: "bold",
    textDecoration: "none",
    fontSize: "16px"
  },

  divider: {
    display: "inline-block",
    width: "1px",
    height: "14px",
    backgroundColor: vars.colors.border,
    verticalAlign: "middle",
    margin: "0 10px"
  },

  image: {
    width: "100%",
    borderRadius: vars.borderRadius,
    display: "block"
  }
} as const;
