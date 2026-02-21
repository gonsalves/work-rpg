import * as THREE from 'three';

export class CommonAreas {
  constructor() {
    this.group = new THREE.Group();
    this.lobbyCenter = { x: 0, z: 0 };
    this.breakRoomCenter = { x: 0, z: 0 };
  }

  buildLobby(x, z, width, depth) {
    this.lobbyCenter = { x: x + width / 2, z: z + depth / 2 };

    const cx = x + width / 2;
    const cz = z + depth / 2;

    // Reception desk — slightly north of center
    const deskMat = new THREE.MeshStandardMaterial({
      color: 0xe0e0e0,
      roughness: 0.4,
      metalness: 0.15
    });
    const deskGeo = new THREE.BoxGeometry(2, 1, 0.8);
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.set(cx, 0.5, z + depth * 0.35);
    desk.castShadow = true;
    this.group.add(desk);

    // --- Waiting benches (dark wood, along sides) ---
    const benchMat = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.7,
      metalness: 0.05
    });
    const benchLegMat = new THREE.MeshStandardMaterial({
      color: 0x3a2a1a,
      roughness: 0.8
    });

    const benchPositions = [
      { bx: x + 1.8, bz: z + depth * 0.65 },
      { bx: x + width - 1.8, bz: z + depth * 0.65 }
    ];

    for (const { bx, bz } of benchPositions) {
      // Bench seat
      const seatGeo = new THREE.BoxGeometry(1.6, 0.08, 0.5);
      const seat = new THREE.Mesh(seatGeo, benchMat);
      seat.position.set(bx, 0.42, bz);
      seat.castShadow = true;
      this.group.add(seat);

      // 4 bench legs
      const legGeo = new THREE.BoxGeometry(0.06, 0.42, 0.06);
      const legOffsets = [[-0.7, -0.18], [-0.7, 0.18], [0.7, -0.18], [0.7, 0.18]];
      for (const [lx, lz] of legOffsets) {
        const leg = new THREE.Mesh(legGeo, benchLegMat);
        leg.position.set(bx + lx, 0.21, bz + lz);
        this.group.add(leg);
      }
    }

    // --- Small round side table between benches ---
    const sideTableMat = new THREE.MeshStandardMaterial({
      color: 0xc4a882,
      roughness: 0.5,
      metalness: 0.05
    });
    const sideTableTop = new THREE.CylinderGeometry(0.3, 0.3, 0.04, 12);
    const sideTable = new THREE.Mesh(sideTableTop, sideTableMat);
    sideTable.position.set(cx, 0.48, z + depth * 0.65);
    sideTable.castShadow = true;
    this.group.add(sideTable);

    const sideTableLeg = new THREE.CylinderGeometry(0.04, 0.04, 0.48, 8);
    const stLeg = new THREE.Mesh(sideTableLeg, sideTableMat);
    stLeg.position.set(cx, 0.24, z + depth * 0.65);
    this.group.add(stLeg);

    // --- Plants flanking the entrance (near Z=2) ---
    this._buildPlant(x + 1.2, z + 2);
    this._buildPlant(x + width - 1.2, z + 2);

    // --- Rug covering the waiting area ---
    const rugMat = new THREE.MeshStandardMaterial({
      color: 0x8b6b4a,
      roughness: 0.9,
      metalness: 0,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    const rugGeo = new THREE.PlaneGeometry(width - 2, depth * 0.35);
    const rug = new THREE.Mesh(rugGeo, rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(cx, 0.005, z + depth * 0.65);
    rug.receiveShadow = true;
    this.group.add(rug);
  }

  buildBreakRoom(x, z, width, depth) {
    this.breakRoomCenter = { x: x + width / 2, z: z + depth / 2 };

    const cx = x + width / 2;
    const cz = z + depth / 2;

    // --- Round table (center) ---
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0xf0f0f0,
      roughness: 0.5,
      metalness: 0.05
    });
    const tableGeo = new THREE.CylinderGeometry(1, 1, 0.08, 16);
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(cx, 0.72, cz);
    table.castShadow = true;
    this.group.add(table);

    // Table leg
    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.72, 8);
    const leg = new THREE.Mesh(legGeo, tableMat);
    leg.position.set(cx, 0.36, cz);
    this.group.add(leg);

    // --- 4 chairs around the round table ---
    const chairMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.7,
      metalness: 0.1
    });
    const chairLegMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.8
    });

    const chairDist = 1.6;
    const chairAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];

    for (const angle of chairAngles) {
      const chairX = cx + Math.cos(angle) * chairDist;
      const chairZ = cz + Math.sin(angle) * chairDist;

      const chairGroup = new THREE.Group();

      // Seat
      const seatGeo = new THREE.BoxGeometry(0.45, 0.05, 0.45);
      const seat = new THREE.Mesh(seatGeo, chairMat);
      seat.position.set(0, 0.42, 0);
      chairGroup.add(seat);

      // Back (faces toward table center)
      const backGeo = new THREE.BoxGeometry(0.45, 0.35, 0.05);
      const back = new THREE.Mesh(backGeo, chairMat);
      back.position.set(0, 0.6, 0.22);
      chairGroup.add(back);

      // 4 legs
      const cLegGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6);
      const cLegOffsets = [[-0.18, -0.18], [-0.18, 0.18], [0.18, -0.18], [0.18, 0.18]];
      for (const [lx, lz] of cLegOffsets) {
        const cLeg = new THREE.Mesh(cLegGeo, chairLegMat);
        cLeg.position.set(lx, 0.21, lz);
        chairGroup.add(cLeg);
      }

      chairGroup.position.set(chairX, 0, chairZ);
      // Rotate chair to face the table center
      chairGroup.rotation.y = -angle + Math.PI;
      chairGroup.castShadow = true;
      this.group.add(chairGroup);
    }

    // --- Couch at back wall ---
    const couchMat = new THREE.MeshStandardMaterial({
      color: 0x4a6a5a,
      roughness: 0.8,
      metalness: 0.02
    });

    const couchX = cx;
    const couchZ = z + depth - 2;

    // Couch seat
    const couchSeatGeo = new THREE.BoxGeometry(2.4, 0.25, 0.8);
    const couchSeat = new THREE.Mesh(couchSeatGeo, couchMat);
    couchSeat.position.set(couchX, 0.35, couchZ);
    couchSeat.castShadow = true;
    this.group.add(couchSeat);

    // Couch back
    const couchBackGeo = new THREE.BoxGeometry(2.4, 0.5, 0.15);
    const couchBack = new THREE.Mesh(couchBackGeo, couchMat);
    couchBack.position.set(couchX, 0.6, couchZ + 0.35);
    couchBack.castShadow = true;
    this.group.add(couchBack);

    // Couch armrests
    const armGeo = new THREE.BoxGeometry(0.15, 0.35, 0.8);
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(armGeo, couchMat);
      arm.position.set(couchX + side * 1.15, 0.5, couchZ);
      arm.castShadow = true;
      this.group.add(arm);
    }

    // --- Water cooler (left wall) ---
    const coolerBodyMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.4,
      metalness: 0.2
    });
    const coolerJugMat = new THREE.MeshStandardMaterial({
      color: 0x88bbdd,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.6
    });

    const coolerX = x + 1.2;
    const coolerZ = cz - 2;

    // Body
    const coolerBodyGeo = new THREE.BoxGeometry(0.4, 0.9, 0.35);
    const coolerBody = new THREE.Mesh(coolerBodyGeo, coolerBodyMat);
    coolerBody.position.set(coolerX, 0.45, coolerZ);
    coolerBody.castShadow = true;
    this.group.add(coolerBody);

    // Jug
    const coolerJugGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.35, 10);
    const coolerJug = new THREE.Mesh(coolerJugGeo, coolerJugMat);
    coolerJug.position.set(coolerX, 1.07, coolerZ);
    coolerJug.castShadow = true;
    this.group.add(coolerJug);

    // --- Bookshelf (right wall) ---
    const shelfWoodMat = new THREE.MeshStandardMaterial({
      color: 0x8b6f47,
      roughness: 0.7,
      metalness: 0.05
    });

    const shelfX = x + width - 1.2;
    const shelfZ = cz - 2;

    // Frame — back panel
    const backPanelGeo = new THREE.BoxGeometry(1.0, 1.4, 0.06);
    const backPanel = new THREE.Mesh(backPanelGeo, shelfWoodMat);
    backPanel.position.set(shelfX, 0.7, shelfZ + 0.2);
    backPanel.castShadow = true;
    this.group.add(backPanel);

    // Two shelves
    const shelfGeo = new THREE.BoxGeometry(1.0, 0.04, 0.35);
    for (const shelfY of [0.5, 0.95]) {
      const shelf = new THREE.Mesh(shelfGeo, shelfWoodMat);
      shelf.position.set(shelfX, shelfY, shelfZ);
      this.group.add(shelf);
    }

    // Books on shelves — small colored boxes
    const bookColors = [0xc0392b, 0x2980b9, 0x27ae60, 0xf39c12, 0x8e44ad, 0xe67e22];
    let bookIdx = 0;
    for (const shelfY of [0.52, 0.97]) {
      for (let bx = -0.35; bx <= 0.35; bx += 0.18) {
        const color = bookColors[bookIdx % bookColors.length];
        const bookMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
        const bookHeight = 0.2 + Math.random() * 0.1;
        const bookGeo = new THREE.BoxGeometry(0.1, bookHeight, 0.22);
        const book = new THREE.Mesh(bookGeo, bookMat);
        book.position.set(shelfX + bx, shelfY + bookHeight / 2, shelfZ);
        this.group.add(book);
        bookIdx++;
      }
    }

    // --- Plants (original 2 + 2 more in opposite corners) ---
    const plantPositions = [
      [x + 1.5, z + 2],
      [x + width - 1.5, z + depth - 2],
      [x + width - 1.5, z + 2],
      [x + 1.5, z + depth - 2]
    ];
    for (const [px, pz] of plantPositions) {
      this._buildPlant(px, pz);
    }
  }

  _buildPlant(x, z) {
    const potMat = new THREE.MeshStandardMaterial({
      color: 0xd4a76a,
      roughness: 0.8
    });
    const potGeo = new THREE.CylinderGeometry(0.2, 0.15, 0.3, 8);
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.set(x, 0.15, z);
    this.group.add(pot);

    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x4caf50,
      roughness: 0.8,
      flatShading: true
    });
    const leafGeo = new THREE.SphereGeometry(0.35, 6, 5);
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(x, 0.6, z);
    leaf.castShadow = true;
    this.group.add(leaf);
  }

  getLobbyCenter() { return this.lobbyCenter; }
  getBreakRoomCenter() { return this.breakRoomCenter; }
  getGroup() { return this.group; }
}
