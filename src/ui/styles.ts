import { baseStyles } from "./styles/base";
import { headingStyles } from "./styles/headings";
import { outlineStyles } from "./styles/outline";
import { panelStyles } from "./styles/panel";
import { responsiveStyles } from "./styles/responsive";

export const styles = [baseStyles, headingStyles, panelStyles, outlineStyles, responsiveStyles].join("\n");
