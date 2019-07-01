/*
 *  most of this file is cannibalized from expo-pixi all credit goes to the creators of expo-pixi
 *  https://github.com/expo/expo-pixi
 */

import React, { Component } from "react";
import { GLView } from "expo-gl";
import {
  View,
  PixelRatio,
  PanResponder,
  Platform,
  Dimensions
} from "react-native";
import * as ExpoPixi from "expo-pixi";
import { BezierPath, BezierProvider } from "expo-pixi/lib/core/signature";
import { vec2 } from "gl-matrix";
import _ from "lodash";

/* eslint-disable no-underscore-dangle */
global.__SignatureId = global.__SignatureId || 0;

const deviceScale = PixelRatio.get();

const scaled = nativeEvent => {
  const out = vec2.fromValues(nativeEvent.locationX, nativeEvent.locationY);
  vec2.scale(out, out, deviceScale);
  return out;
};

const calculateSize = (height, width) => {
  let h;
  let w;

  if (width < height) {
    // portrait
    w = width - 10;
    h = (width - 10) * (4 / 16);
  } else {
    // landscape
    w = width * 0.9;
    h = width * 0.9 * (4 / 16);
  }

  return { height: h, width: w };
};

class Signature extends Component {
  constructor(props) {
    super(props);

    this.signatureId = global.__ExpoSignatureId++;

    this.provider = new BezierProvider();

    let { height, width } = Dimensions.get("window");

    ({ height, width } = calculateSize(height, width));

    this.state = {
      sigWidth: width,
      sigHeight: height,
      sigX: 0,
      sigY: 0,
      scale: 1
    };

    this.origWidth = width;

    this.panResponder = PanResponder.create({
      onStartShouldSetResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: ({ nativeEvent }) => this.onPanGrant(nativeEvent),
      onPanResponderMove: ({ nativeEvent }) => this.onPanMove(nativeEvent),
      onPanResponderRelease: ({ nativeEvent }) => this.onPanEnd(nativeEvent),
      onPanResponderTerminate: ({ nativeEvent }) => this.onPanEnd(nativeEvent)
    });

    this.signatureContainerRef = React.createRef();

    this.paths = [];
  }

  componentDidMount() {
    this._drawSub = this.provider.addListener(
      BezierProvider.EVENT_DRAW_PATH,
      this._drawPath
    );
  }

  componentWillUnmount() {
    this._drawSub.remove();
  }

  panStarted = false;
  panResponderQueue = [];

  onPanEnd = nativeEvent => {
    if (this.state.sigX === 0 && this.state.sigY === 0) {
      this.panResponderQueue.push({
        type: "END",
        nativeEvent
      });
      return;
    }

    if (!this.panStarted) {
      return;
    }

    this.panStarted = false;

    // add 0.1 to the last point to reduce the likelyhood of the last two points being the exact same which causes an issue on some android devices
    this.provider.addPointToSignature(
      scaled({
        locationX: nativeEvent.locationX + 1,
        locationY: nativeEvent.locationY
      }),
      true
    );
    this.provider.reset();
  };

  onPanMove = nativeEvent => {
    const { sigHeight, sigWidth, sigX, sigY } = this.state;

    const { pageX, pageY } = nativeEvent;

    if (!this.panStarted) {
      if (
        pageX >= sigX &&
        pageX <= sigX + sigWidth &&
        pageY >= sigY &&
        pageY <= sigY + sigHeight
      ) {
        this.panStarted = true;
        this.provider.reset();
        this.provider.addPointToSignature(scaled(nativeEvent));
      }
      return;
    }

    if (
      pageX < sigX ||
      pageX > sigX + sigWidth ||
      pageY < sigY ||
      pageY > sigY + sigHeight
    ) {
      this.onPanEnd({
        locationX: Math.min(Math.max(0, pageX - sigX), sigWidth),
        locationY: Math.min(Math.max(0, pageY - sigY), sigHeight)
      });
    } else {
      this.provider.addPointToSignature(scaled(nativeEvent));
    }
  };

  onPanGrant = nativeEvent => {
    this.panStarted = true;
    this.provider.reset();
    this.provider.addPointToSignature(scaled(nativeEvent));
  };

  _drawPath = (type, points, finalized) => {
    this.stage.removeChild(this.graphicsTmp);

    const graphics = new ExpoPixi.PIXI.Graphics();

    if (finalized) {
      this.graphics = graphics;
      // paths allows for the redraw all to work with the same data as the original paths
      this.paths.push({
        type,
        points: _.cloneDeep(points)
      });
    } else {
      this.graphicsTmp = graphics;
    }
    graphics.endFill();
    graphics.closePath();
    graphics.clear();
    this.stage.addChild(graphics);
    // Use color instead of 0x000000 if you want to see each segment separately
    const color = Math.floor(Math.random() * 16777216);
    graphics.beginFill(0x000000);
    graphics.lineStyle(1, 0x000000, 1);

    BezierPath[type](points, graphics);

    graphics.endFill();
    this.renderer._update();
  };

  clearSignature = () => {
    this.provider.reset();
    this.paths = [];
    if (!this.renderer) {
      return;
    }

    if (this.stage.children.length > 0) {
      this.stage.removeChildren();
      this.renderer._update();
    }
  };

  undo = () => {
    if (!this.renderer) {
      return null;
    }

    const { children } = this.stage;
    if (children.length > 0) {
      const child = children[children.length - 1];
      this.stage.removeChild(child);
      this.renderer._update();
      this.paths.pop();
      return child;
    }
    return null;
  };

  redrawAll = () => {
    this.context.enableLogging = true;
    const paths = this.paths.slice();
    this.clearSignature();

    paths.forEach(p => {
      this._drawPath(p.type, p.points, true);
    });

    this.context.enableLogging = false;
  };

  redraw = () => {
    const { children } = this.stage;
    if (children.length > 0) {
      const child = children[children.length - 1];
      this.stage.removeChild(child);
      this.renderer._update();
      const data = this.paths.pop();
      this._drawPath(data.type, data.points, true);
    }
  };

  takeSnapshotAsync = async (...args) => {
    this.renderer._update();

    await new Promise(r => setTimeout(r, 200)); // wait for the renderer to do its update

    return this.glView.takeSnapshotAsync(...args);
  };

  onSignatureLayout = () => {
    setTimeout(
      () => {
        // Let it finish the layout change first
        if (this.signatureContainerRef.current) {
          this.signatureContainerRef.current.measure(
            (fx, fy, width, height, px, py) => {
              this.setState({ sigX: px, sigY: py });
            }
          );
        }
      },
      Platform.OS === "ios" ? 500 : 250
    );
  };

  onLayout = ({
    nativeEvent: {
      layout: { width, height }
    }
  }) => {
    if (this.renderer) {
      const scale = PixelRatio.get();
      this.renderer.resize(width * scale, height * scale);
      this.renderer._update();
    }
  };

  setRef = ref => {
    this.glView = ref;
  };

  onContextCreate = async context => {
    this.context = context;

    this.graphicsTmp = new ExpoPixi.PIXI.Graphics();

    this.stage = new ExpoPixi.PIXI.Container();
    this.stage.addChild(this.graphicsTmp);

    const getAttributes = context.getContextAttributes || (() => ({}));
    this.context.getContextAttributes = () => {
      const contextAttributes = getAttributes();
      return {
        ...contextAttributes,
        stencil: true
      };
    };

    this.renderer = ExpoPixi.PIXI.autoDetectRenderer(
      context.drawingBufferWidth,
      context.drawingBufferHeight,
      {
        context,
        antialias: true,
        backgroundColor: 0xffffff,
        transparent: false,
        autoStart: false
      }
    );
    // Add scaling to the renderer
    this.renderer._update = () => {
      this.renderer.render(this.stage); // render the lines
      context.endFrameEXP(); // tell the renderer to paint
    };
    this.renderer._update();
  };

  render() {
    return (
      <View
        ref={this.signatureContainerRef}
        style={[
          {
            height: this.state.sigHeight,
            width: this.state.sigWidth
          }
        ]}
        onLayout={this.onSignatureLayout}
      >
        <GLView
          ref={this.setRef}
          style={{ flex: 1 }}
          onLayout={this.onLayout}
          key={`Signature-${this.signatureId}`}
          onReady={this.onReady}
          {...this.panResponder.panHandlers}
          onContextCreate={this.onContextCreate}
        />
      </View>
    );
  }
}

export default Signature;
