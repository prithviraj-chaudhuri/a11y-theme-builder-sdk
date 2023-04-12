/*
 * Copyright (c) 2023 Discover Financial Services
 * Licensed under MIT License. See License.txt in the project root for license information
 */
import { Atom } from "./atom";
import { ColorTheme } from "./colorThemes";
import { IAtoms, EventValueChange } from "../interfaces";
import { Shade } from "../common/shade";
import { PropertyString, PropertyBoolean, PropertyGroupListener } from "../common/props";
import { Logger } from "../util/logger";

const log = new Logger("ss");

/**
 * The state settings atom.
 * @category Atoms
 */
export class StateSettings extends Atom {

    /** The info state setting properties */
    public readonly info: StateSetting;
    /** The success state setting properties */
    public readonly success: StateSetting;
    /** The warning state setting properties */
    public readonly warning: StateSetting;
    /** The danger state setting properties */
    public readonly danger: StateSetting;
    /** All state setting properties */
    public readonly all: StateSetting[] = [];
    /** Property set to true when everything is ready */
    public readonly ready: PropertyBoolean;

    constructor(atoms: IAtoms) {
        super("State Settings", false, atoms);
        this.addDependency(atoms.colorThemes);
        this.info = new StateSetting("info", "#0066EF", this);
        this.success = new StateSetting("success", "#327D35", this);
        this.warning = new StateSetting("warning", "#FDC630", this);
        this.danger = new StateSetting("danger", "#D62B2B", this);
        this.ready = new PropertyBoolean("ready", false, this, {defaultValue: false});
        this.atoms.colorThemes.defaultTheme.setPropertyListener(`_tb.StateSettings`, this.setDefaultTheme.bind(this));
    }

    private setDefaultTheme(_: EventValueChange<string>) {
        log.debug("StateSettings default theme was set");
        const self = this;
        const theme = this.atoms.colorThemes.getDefaultTheme() as ColorTheme;
        if (!theme) throw new Error("There is no default theme");
        new PropertyGroupListener("stateSettings", [theme.lightModeBackground, theme.darkModeBackground], function(_: PropertyGroupListener){
            log.debug("StateSettings light and dark mode are set in theme");
            for (const ss of self.all) {
                ss.setShades();
            }
            self.ready.setValue(true);
        });
    }

    public deserialize(obj: any) {
        if (!obj) return;
        super.deserialize(obj);
        this.info.prop.deserialize(obj.information);
        this.success.prop.deserialize(obj.success);
        this.warning.prop.deserialize(obj.warning);
        this.danger.prop.deserialize(obj.danger);
    }

    public serialize(): any {
        const obj: any = {};
        obj.information = this.info.prop.serialize();
        obj.success = this.success.prop.serialize();
        obj.warning = this.warning.prop.serialize();
        obj.danger = this.danger.prop.serialize();
        return obj;
    }

}

export class StateSetting {

    public readonly name: string;
    public readonly prop: PropertyString;
    public lmShade: Shade = Shade.WHITE;
    public dmShade: Shade = Shade.BLACK;
    private atoms: IAtoms;

    constructor(name: string, defaultValue: string, ss: StateSettings) {
        this.name = name;
        this.atoms = ss.atoms;
        this.prop = new PropertyString(name, false, ss, {defaultValue});
        this.prop.setPropertyListener(`_tb.StateSetting.${name}`, this.setShadesListener.bind(this));
        ss.all.push(this);
    }

    private setShadesListener(_: EventValueChange<string>) {
        this.setShades();
    }

    public setShades() {
        log.debug(`StateSettings.setShades enter: name=${this.name}`);
        const theme = this.atoms.colorThemes.getDefaultTheme() as ColorTheme;
        if (!theme) {
            log.debug(`StateSettings.setShades exit (no default theme): name=${this.name}`);
            return;
        }
        this.setLMShade(theme);
        this.setDMShade(theme);
        log.debug(`StateSettings.setShades exit: name=${this.name}`);
    }

    private setLMShade(theme: ColorTheme) {
        log.debug(`StateSettings.setLMShade enter - name=${this.name}`);
        const hex = this.prop.getValue();
        if (!hex) throw new Error(`StateSettings.setLMShade exit (no hex) - name=${this.name}`);
        const lmbg = theme.lightModeBackground.getValue();
        if (!lmbg) throw new Error(`StateSettings.setLMShade exit (no lightmode background) - name=${this.name}`);
        this.lmShade = Shade.fromHex(hex).findLMShade(lmbg.secondary, 3.1);
        log.debug(`StateSettings.setLMShade exit: name=${this.name}, shade=${JSON.stringify(this.lmShade)}`);
    }

    private setDMShade(theme: ColorTheme) {
        log.debug("StateSettings.setDMShade enter");
        const dmbg = theme.darkModeBackground.getValue();
        if (!dmbg) throw new Error("StateSettings.setDMShade exit (no darkmode background)");
        this.dmShade = this.lmShade.findDMShade(dmbg.primary, 3.1);
        log.debug(`StateSettings.setDMShade exit: ${JSON.stringify(this.dmShade)}`);
    }

}