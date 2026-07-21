import "./styles/global.css";
import { applyManifestBase } from "./pwa/manifest";
import { startApplication } from "virtual:hiri-bootstrap";

applyManifestBase();
void startApplication();
