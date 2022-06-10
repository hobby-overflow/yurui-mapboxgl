import React from 'react';
import mapboxgl, { CustomLayerInterface } from 'mapbox-gl';
import * as THREE from 'three';

import TOKEN from './Token';

import './styles/Map.css';
import 'mapbox-gl/dist/mapbox-gl.css';

export class Map extends React.Component<{}, { value: any }> {
  constructor(props: any) {
    super(props);
  }

  private camera!: THREE.Camera;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private map!: mapboxgl.Map;


  componentDidMount = () => {
    this.map = new mapboxgl.Map({
      container: document.getElementById('mapContainer') as HTMLElement,
      center: [141.6927, 42.7622],
      pitch: 60,
      zoom: 16,
      antialias: true,
      style: 'mapbox://styles/mapbox/satellite-v9',
      accessToken: TOKEN
    });

    const modelOrigin = this.map.getCenter();
    const modelAltitude = 0;
    const modelRotate = [Math.PI / 2, 0, 0];

    const modelAsMercatorCoodinate = mapboxgl.MercatorCoordinate.fromLngLat(
      modelOrigin,
      modelAltitude
    );

    const modelTransform = {
      translateX: modelAsMercatorCoodinate.x,
      translateY: modelAsMercatorCoodinate.y,
      translateZ: modelAsMercatorCoodinate.z,
      rotateX: modelRotate[0],
      rotateY: modelRotate[1],
      rotateZ: modelRotate[2],
      scale: modelAsMercatorCoodinate.meterInMercatorCoordinateUnits()
    };

    const customLayer: CustomLayerInterface = {
      id: '3d-model',
      type: 'custom',
      renderingMode: '3d',
      onAdd: (map, gl) => {
        this.camera = new THREE.Camera();
        this.scene = new THREE.Scene();

        const directionalLight = new THREE.DirectionalLight(0xffffff);
        directionalLight.position.set(0, 70, 100).normalize();
        this.scene.add(directionalLight);

        const boxSize = 20;
        const boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
        const boxMaterial = new THREE.MeshNormalMaterial();
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.y = boxSize / 2;
        this.scene.add(box);
        
        console.log(box.position);

        this.map = map;

        this.renderer = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl,
          antialias: true,
        });

        this.renderer.autoClear = false;
      },
      render: (_: WebGLRenderingContext, matrix) => {
        const rotationX = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(1, 0, 0),
          modelTransform.rotateX
        );
        const rotationY = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(0, 1, 0),
          modelTransform.rotateY
        );
        const rotationZ = new THREE.Matrix4().makeRotationAxis(
          new THREE.Vector3(0, 0, 1),
          modelTransform.rotateZ
        );

        const m = new THREE.Matrix4().fromArray(matrix);
        const l = new THREE.Matrix4()
          .makeTranslation(
            modelTransform.translateX,
            modelTransform.translateY,
            modelTransform.translateZ!
          )
          .scale(
            new THREE.Vector3(
              modelTransform.scale,
              -modelTransform.scale,
              modelTransform.scale
            )
          )
          .multiply(rotationX)
          .multiply(rotationY)
          .multiply(rotationZ);

        this.camera.projectionMatrix = m.multiply(l);
        this.renderer.resetState();
        this.renderer.render(this.scene, this.camera);
        this.map.triggerRepaint();
      },
    };
    this.map.on('style.load', () => {
      this.map.addLayer(customLayer);
      this.map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 0.0],
          'sky-atmosphere-sun-intensity': 15,
        },
      });
    });
  };
  render = () => {
    return <div id="mapContainer"></div>;
  };
}
