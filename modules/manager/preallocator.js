/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/ */
"use strict";

const {
	createOptimizedImplementation
} = require("support/optimpl");
const {Logger} = require("utils");

const {prealloc: _asynccopier} = require("manager/preallocator/asynccopier");
const {prealloc: _cothread} = require("manager/preallocator/cothread");

const SIZE_MIN = (require("version").OS == 'winnt' ? 256 : 2048) * 1024;
const SIZE_COTHREAD_MAX = (1<<24);

const _impl = createOptimizedImplementation(
	"resource://dta/manager/preallocator/worker.js",
	function(impl) function (file, size, perms, sparseOK, callback) {
		let data = Object.create(null);
		data.file = file.path;
		data.size = size;
		data.perms = perms;
		data.sparseOK = sparseOK;
		return impl(data, callback);
	},
	function(file, size, perms, sparseOK, callback) {
		if (size < SIZE_COTHREAD_MAX) {
			return _cothread(file, size, perms, sparseOK, callback);
		}
		return _asynccopier(file, size, perms, sparseOK, callback);
	});

/**
 * Pre-allocates a given file on disk
 * and calls given callback when done
 *
 * @param file (nsIFile) file to allocate
 * @param size (int) Size to allocate
 * @param perms (int) *nix file permissions
 * @param callback (function) Callback called once done
 * @param tp (function) Scope (this) to call the callback function in
 * @return (nsICancelable) Pre-allocation object.
 */
exports.prealloc = function prealloc(file, size, perms, sparseOk, callback) {
	if (size <= SIZE_MIN || !isFinite(size)) {
		if (Logger.enabled) {
			Logger.log("pa: not preallocating: " + file);
		}
		if (callback) {
			callback(false);
		}
		return null;
	}
	if (Logger.enabled) {
		Logger.log("pa: preallocating: " + file + " size: " + size);
	}
	return _impl.callImpl(file, size, perms, sparseOk, callback || function() {});
}
