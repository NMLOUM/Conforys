const express = require("express");
const router = express.Router();
const { getMe, updateMe, getAllUsers, createUser, updateUser, deleteUser } = require("../controllers/userController");
const { protect }   = require("../middlewares/authMiddleware");
const { authorize } = require("../middlewares/roleMiddleware");

router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);

// GET  /api/users      →  ADMIN et RESPONSABLE_QHSE peuvent consulter la liste
router.get("/", protect, authorize("ADMIN", "RESPONSABLE_QHSE"), getAllUsers);

// POST /api/users      →  seul l'ADMIN peut créer un utilisateur
router.post("/", protect, authorize("ADMIN"), createUser);

// PUT  /api/users/:id  →  seul l'ADMIN peut modifier un utilisateur
router.put("/:id", protect, authorize("ADMIN"), updateUser);

// DELETE /api/users/:id →  seul l'ADMIN peut supprimer un utilisateur
router.delete("/:id", protect, authorize("ADMIN"), deleteUser);

module.exports = router;
